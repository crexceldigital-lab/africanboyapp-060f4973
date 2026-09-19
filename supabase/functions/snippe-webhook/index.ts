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
    let paymentStatus = "unpaid";

    if (event === "payment.completed" || paymentData?.status === "completed") {
      newStatus = "completed";
      paymentStatus = "paid";
    } else if (event === "payment.failed" || paymentData?.status === "failed") {
      newStatus = "cancelled";
      paymentStatus = "failed";
    } else if (paymentData?.status === "voided" || paymentData?.status === "expired") {
      newStatus = "cancelled";
      paymentStatus = "cancelled";
    }

    // Fetch order details for inventory deduction & amount paid
    let orderRecord: any = null;
    if (orderId) {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      orderRecord = data;
    } else if (reference) {
      const { data } = await supabase.from("orders").select("*").eq("payment_reference", reference).maybeSingle();
      orderRecord = data;
    }

    const actualOrderId = orderRecord?.id || orderId;

    if (actualOrderId) {
      const updateData: Record<string, any> = {
        status: newStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      };

      if (paymentStatus === "paid" && orderRecord) {
        updateData.amount_paid = orderRecord.total_amount;
        updateData.balance = 0;
      }

      if (paymentData?.channel?.type) {
        updateData.payment_method = paymentData.channel.type;
      }

      await supabase.from("orders").update(updateData).eq("id", actualOrderId);

      // Inventory deduction & activity log on payment completion
      if (paymentStatus === "paid" && orderRecord && orderRecord.payment_status !== "paid") {
        const storeId = orderRecord.store_id || 1;
        const items = Array.isArray(orderRecord.items) ? orderRecord.items : [];

        for (const item of items) {
          const prodId = item.product_id || item.id;
          const qty = Number(item.quantity) || 1;

          if (prodId) {
            // Deduct master stock
            const { data: prod } = await supabase.from("products").select("stock_quantity").eq("id", prodId).maybeSingle();
            if (prod) {
              const currentStock = Number(prod.stock_quantity) || 0;
              const newStock = Math.max(0, currentStock - qty);
              await supabase.from("products").update({ stock_quantity: newStock }).eq("id", prodId);

              // Deduct store availability stock
              const { data: storeAvail } = await supabase
                .from("product_store_availability")
                .select("stock_quantity")
                .eq("product_id", prodId)
                .eq("store_id", storeId)
                .maybeSingle();

              if (storeAvail) {
                const storeCurrentStock = Number(storeAvail.stock_quantity) || 0;
                await supabase
                  .from("product_store_availability")
                  .update({ stock_quantity: Math.max(0, storeCurrentStock - qty) })
                  .eq("product_id", prodId)
                  .eq("store_id", storeId);
              }

              // Record inventory movement
              await supabase.from("inventory_movements").insert({
                product_id: prodId,
                store_id: storeId,
                quantity: -qty,
                movement_type: "SALE",
                reference_id: actualOrderId,
                previous_stock: currentStock,
                new_stock: newStock,
              });
            }
          }
        }

        // Record Activity
        await supabase.from("order_activity").insert({
          order_id: actualOrderId,
          actor_name: "Payment Gateway",
          action: "PAYMENT_CONFIRMED",
          details: `Payment confirmed via ${paymentData?.channel?.type || 'Snippe'}. Amount: ${orderRecord.total_amount} ${orderRecord.currency || 'TZS'}`
        });
      }
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
