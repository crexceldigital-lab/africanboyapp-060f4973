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

    // Get user from auth header if present
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await supabaseUser.auth.getClaims(token);
        if (claimsData?.claims) {
          userId = claimsData.claims.sub as string;
          userEmail = claimsData.claims.email as string;
        }
      } catch (e) {
        console.warn("Guest or invalid auth token in create-payment:", e);
      }
    }

    const body = await req.json();
    const { items, totalAmount, deliveryFee, discountAmount, deliveryZone, currency, customerName, customerEmail, customerPhone, redirectUrl, deliveryAddress, deliveryLatitude, deliveryLongitude, isGuest } = body;

    const isGuestOrder = Boolean(isGuest) || !userId;
    const orderCurrency = currency || "TZS";
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Call atomic RPC: process_online_checkout
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("process_online_checkout", {
      p_customer_name: customerName || "Guest Customer",
      p_customer_phone: customerPhone || "",
      p_customer_email: customerEmail || userEmail || null,
      p_delivery_address: typeof deliveryAddress === "string" ? deliveryAddress.slice(0, 400) : null,
      p_delivery_zone: deliveryZone || "inside_dar",
      p_delivery_fee: Number(deliveryFee) || 0,
      p_discount_amount: Number(discountAmount) || 0,
      p_currency: orderCurrency,
      p_is_guest: isGuestOrder,
      p_items: items,
      p_user_id: userId,
    });

    if (rpcError) {
      throw new Error(`Checkout Error: ${rpcError.message}`);
    }

    const orderId = rpcData.order_id;
    const orderNumber = rpcData.order_number;
    const serverTotalAmount = Number(rpcData.total_amount);

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
        amount: Math.round(serverTotalAmount),
        currency: currency || "TZS",
        allowed_methods: ["mobile_money", "card"],
        customer: {
          name: customerName || "",
          phone: customerPhone || "",
          email: customerEmail || userEmail || "",
        },
        redirect_url: redirectUrl || "",
        webhook_url: webhookUrl,
        description: `African Boy Order #${orderNumber}`,
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          user_id: userId,
        },
        expires_in: 3600,
        line_items: items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          amount: Math.round((item.price || 0) * (item.quantity || 1)),
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
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: sessionData.checkout_url,
        order_id: orderId,
        order_number: orderNumber,
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
