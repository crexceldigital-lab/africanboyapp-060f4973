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

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-snippe-signature");
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

    // Extract order_id from metadata
    const orderId = paymentData?.metadata?.order_id;
    const reference = paymentData?.reference;

    if (!orderId && !reference) {
      console.log("No order_id or reference in webhook payload");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newStatus = "pending";
    if (event === "payment.completed" || paymentData?.status === "completed") {
      newStatus = "completed";
    } else if (event === "payment.failed" || paymentData?.status === "failed") {
      newStatus = "failed";
    } else if (paymentData?.status === "voided" || paymentData?.status === "expired") {
      newStatus = "cancelled";
    }

    // Update order by order_id or payment_reference
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (paymentData?.channel?.type) {
      updateData.payment_method = paymentData.channel.type;
    }

    let query = supabase.from("orders").update(updateData);
    if (orderId) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("payment_reference", reference);
    }

    const { error } = await query;
    if (error) {
      console.error("Failed to update order:", error);
    }

    // Operational sync: append confirmed orders to the Google Sheet (non-blocking).
    if (newStatus === "completed") {
      try {
        let syncOrderId = orderId as string | undefined;
        if (!syncOrderId && reference) {
          const { data: found } = await supabase
            .from("orders")
            .select("id")
            .eq("payment_reference", reference)
            .maybeSingle();
          syncOrderId = found?.id;
        }
        if (syncOrderId) {
          const { error: syncError } = await supabase.functions.invoke("sync-order-to-sheet", {
            body: { orderId: syncOrderId },
          });
          if (syncError) console.error("Sheet sync failed:", syncError);
        }
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
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
