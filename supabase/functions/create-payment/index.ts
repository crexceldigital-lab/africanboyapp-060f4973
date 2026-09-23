import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// The gateway only accepts E.164 mobile numbers for Tanzania (255), Kenya (254) and Uganda (256).
// Customers type local formats such as 0712345678, so normalise before calling the gateway.
// The gateway also rejects numbers with non-mobile prefixes, so the prefix is validated too.
const SUPPORTED: { code: string; nationalLength: number; mobilePrefixes: string[] }[] = [
  { code: "255", nationalLength: 9, mobilePrefixes: ["6", "7"] }, // Tanzania
  { code: "254", nationalLength: 9, mobilePrefixes: ["7", "1"] }, // Kenya
  { code: "256", nationalLength: 9, mobilePrefixes: ["7"] }, // Uganda
];

function isValidNational(country: { nationalLength: number; mobilePrefixes: string[] }, national: string) {
  return (
    national.length === country.nationalLength &&
    country.mobilePrefixes.some((prefix) => national.startsWith(prefix))
  );
}

function normalizePhoneE164(raw: unknown, defaultCode = "255"): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");
  if (!digits) return null;

  for (const country of SUPPORTED) {
    if (digits.startsWith(country.code)) {
      let national = digits.slice(country.code.length);
      if (national.startsWith("0") && national.length === country.nationalLength + 1) {
        national = national.slice(1);
      }
      if (isValidNational(country, national)) return `+${country.code}${national}`;
    }
  }

  const fallback = SUPPORTED.find((c) => c.code === defaultCode) || SUPPORTED[0];

  if (digits.startsWith("0")) {
    const national = digits.slice(1);
    if (isValidNational(fallback, national)) return `+${fallback.code}${national}`;
  }
  if (isValidNational(fallback, digits)) return `+${fallback.code}${digits}`;

  return null;
}

const UNSUPPORTED_PHONE_MESSAGE =
  "Please enter a valid Tanzanian, Kenyan or Ugandan mobile money number (for example 0712 345 678). International cards are not available yet — contact us on WhatsApp to arrange payment.";

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
    // Reject unusable numbers BEFORE creating an order, so no stranded order is left behind.
    const normalizedPhone = normalizePhoneE164(customerPhone);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ success: false, error: UNSUPPORTED_PHONE_MESSAGE }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Snippe settles only in TZS (other currencies are rejected with a validation error),
    // and all product prices in the database are stored in TZS. The storefront may DISPLAY
    // converted prices, but the charge currency must stay TZS — never silently convert.
    const orderCurrency = "TZS";
    const displayCurrency = currency || "TZS";
    // Snippe hosted checkout currently exposes only "mobile_money". If the merchant account
    // is later activated for cards, set the SNIPPE_ALLOWED_METHODS secret (e.g. "mobile_money,card")
    // — no code change needed. Requesting an unsupported method makes checkout show
    // "This payment method is not available".
    const allowedMethods = (Deno.env.get("SNIPPE_ALLOWED_METHODS") || "mobile_money")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Call atomic RPC: process_online_checkout
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("process_online_checkout", {
      p_customer_name: customerName || "Guest Customer",
      p_customer_phone: normalizedPhone,
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
        currency: orderCurrency,
        allowed_methods: allowedMethods,
        customer: {
          name: customerName || "",
          phone: normalizedPhone,
          email: customerEmail || userEmail || "",
        },
        redirect_url: redirectUrl || "",
        webhook_url: webhookUrl,
        description: `African Boy Order #${orderNumber}`,
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          user_id: userId,
          display_currency: displayCurrency,
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
      // Never leave a stranded pending order behind when the gateway refuses the session.
      try {
        await supabaseAdmin.rpc("fail_order_payment", {
          p_order_id: orderId,
          p_status: "cancelled",
          p_reference: null,
        });
      } catch (_e) {
        // non-fatal
      }

      const gatewayMsg = String(snippeData?.message || "");
      const friendly = /country we collect in/i.test(gatewayMsg)
        ? "Payments are currently accepted with a Tanzanian, Kenyan or Ugandan mobile number. Please enter a mobile money number from one of these countries, or contact us on WhatsApp to arrange payment."
        : `Payment could not be started. ${gatewayMsg || `Gateway error ${snippeRes.status}`}`;
      throw new Error(friendly);
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
