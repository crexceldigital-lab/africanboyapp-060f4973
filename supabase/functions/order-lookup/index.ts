import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "status");

    // ---------- Payment status for an order the customer has just placed ----------
    if (action === "status") {
      const orderId = String(body?.orderId || "");
      if (!UUID_RE.test(orderId)) {
        return json({ success: false, error: "Invalid order reference." }, 400);
      }

      const { data, error } = await admin
        .from("orders")
        .select("order_number, payment_status, status, total_amount, currency")
        .eq("id", orderId)
        .maybeSingle();

      if (error) return json({ success: false, error: error.message }, 400);
      if (!data) return json({ success: false, error: "Order not found." }, 404);

      return json({ success: true, ...data });
    }

    // ---------- Public order tracking (order number + phone or email) ----------
    if (action === "track") {
      const orderNumber = String(body?.orderNumber || "").trim();
      const contact = String(body?.contact || "").trim().toLowerCase();

      if (!orderNumber) {
        return json({ success: false, error: "Please enter your order number." }, 400);
      }

      let query = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(5);
      query = UUID_RE.test(orderNumber)
        ? query.eq("id", orderNumber)
        : query.eq("order_number", orderNumber);

      const { data: rows, error } = await query;
      if (error) return json({ success: false, error: error.message }, 400);
      if (!rows || rows.length === 0) {
        return json({ success: false, error: "No order found with that order number." }, 404);
      }

      // Tracking always requires the phone or email on the order
      if (!contact) {
        return json(
          { success: false, error: "Please also enter the phone number or email used on the order." },
          400
        );
      }

      const order = rows.find((o: any) => {
        const phone = String(o.customer_phone || "").toLowerCase().replace(/[\s\-()]/g, "");
        const email = String(o.customer_email || "").toLowerCase();
        const needle = contact.replace(/[\s\-()]/g, "");
        return (phone && phone.includes(needle)) || (email && email.includes(contact));
      });

      if (!order) {
        return json(
          { success: false, error: "Those details do not match our records for that order number." },
          403
        );
      }

      const [{ data: shipments }, { data: activity }] = await Promise.all([
        admin
          .from("order_shipments")
          .select("*, items:order_shipment_items(*)")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
        admin
          .from("order_activity")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
      ]);

      return json({
        success: true,
        order,
        shipments: shipments || [],
        activity: activity || [],
      });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error: unknown) {
    console.error("order-lookup error:", error);
    const msg = error instanceof Error ? error.message : "Unexpected error";
    return json({ success: false, error: msg }, 500);
  }
});
