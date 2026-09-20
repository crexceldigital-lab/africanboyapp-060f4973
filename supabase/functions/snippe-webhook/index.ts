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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WEBHOOK_SECRET = Deno.env.get("SNIPPE_WEBHOOK_SECRET");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.text();

    // Verify webhook signature if a secret is configured
    if (WEBHOOK_SECRET) {
      const signature =
        req.headers.get("x-webhook-signature") || req.headers.get("x-snippe-signature");
      if (signature) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(WEBHOOK_SECRET),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
        const expectedSig = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (signature !== expectedSig) {
          console.error("Invalid webhook signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body = JSON.parse(rawBody);
    console.log("Snippe webhook received:", JSON.stringify(body));

    const event = body.event || body.type;
    const paymentData = body.data || body;
    const metadataOrderId = paymentData?.metadata?.order_id;
    const reference = paymentData?.reference;

    if (!metadataOrderId && !reference) {
      console.log("No order_id or reference in webhook payload");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the order
    let orderId: string | undefined = metadataOrderId;
    if (!orderId && reference) {
      const { data: found } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_reference", reference)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      orderId = found?.id;
    }

    if (!orderId) {
      console.error("Webhook could not resolve an order", { reference });
      return new Response(JSON.stringify({ received: true, resolved: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = String(paymentData?.status || "").toLowerCase();
    const isPaid = event === "payment.completed" || status === "completed" || status === "paid";
    const isFailed = event === "payment.failed" || status === "failed";
    const isCancelled = status === "voided" || status === "expired" || status === "cancelled";

    let synced = false;

    if (isPaid) {
      // Atomic + idempotent: marks paid and deducts stock exactly once
      const { data, error } = await supabase.rpc("confirm_order_payment", {
        p_order_id: orderId,
        p_reference: reference || null,
        p_amount: paymentData?.amount ? Number(paymentData.amount) : null,
        p_method: paymentData?.channel?.type || paymentData?.method || null,
      });

      if (error) {
        // Return a non-2xx so the gateway retries instead of losing the payment
        console.error("confirm_order_payment failed:", error);
        return new Response(JSON.stringify({ received: true, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      synced = !data?.already_processed;
    } else if (isFailed || isCancelled) {
      const { error } = await supabase.rpc("fail_order_payment", {
        p_order_id: orderId,
        p_status: isCancelled ? "cancelled" : "failed",
        p_reference: reference || null,
      });
      if (error) {
        console.error("fail_order_payment failed:", error);
        return new Response(JSON.stringify({ received: true, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("Webhook event ignored (no terminal payment state):", event, status);
    }

    // Operational sync: append newly confirmed orders to the Google Sheet (never blocks the webhook)
    if (synced) {
      try {
        const { error: syncError } = await supabase.functions.invoke("sync-order-to-sheet", {
          body: { orderId },
        });
        if (syncError) console.error("Sheet sync failed:", syncError);
      } catch (syncErr) {
        console.error("Sheet sync error:", syncErr);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Signature/parse problems are permanent — acknowledge to avoid infinite retries
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
