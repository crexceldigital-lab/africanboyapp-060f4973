import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SNIPPE_API_KEY = Deno.env.get("SNIPPE_API_KEY");
    if (!SNIPPE_API_KEY) throw new Error("SNIPPE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Not authenticated");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const body = await req.json();
    const { items, totalAmount, deliveryFee, grandTotal, deliveryZone, currency, customerName, customerEmail, customerPhone, redirectUrl } = body;

    // Create order in DB using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        status: "pending",
        total_amount: grandTotal,
        delivery_fee: deliveryFee,
        currency: currency || "TZS",
        delivery_zone: deliveryZone,
        items: items,
        customer_name: customerName || "",
        customer_email: customerEmail || userEmail || "",
        customer_phone: customerPhone || "",
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

    // Determine the function URL for webhook
    const projectId = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/snippe-webhook`;

    // Create Snippe payment session
    const snippeRes = await fetch("https://api.snippe.sh/api/v1/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SNIPPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(grandTotal),
        currency: currency || "TZS",
        allowed_methods: ["mobile_money", "qr", "card"],
        customer: {
          name: customerName || "",
          phone: customerPhone || "",
          email: customerEmail || userEmail || "",
        },
        redirect_url: redirectUrl || "",
        webhook_url: webhookUrl,
        description: `African Boy Order #${order.id.slice(0, 8)}`,
        metadata: {
          order_id: order.id,
          user_id: user.id,
        },
        expires_in: 3600,
        line_items: items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          amount: Math.round(item.price * item.quantity),
        })),
      }),
    });

    const snippeData = await snippeRes.json();

    if (!snippeRes.ok) {
      throw new Error(`Snippe API error [${snippeRes.status}]: ${JSON.stringify(snippeData)}`);
    }

    // Update order with payment reference
    const sessionData = snippeData.data;
    await supabaseAdmin
      .from("orders")
      .update({
        payment_reference: sessionData.reference,
        snippe_checkout_url: sessionData.checkout_url,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: sessionData.checkout_url,
        order_id: order.id,
        reference: sessionData.reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Create payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
