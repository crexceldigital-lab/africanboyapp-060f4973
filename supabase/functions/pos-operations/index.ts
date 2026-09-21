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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ---- Authenticate the caller (staff / admin only) ----
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ success: false, error: "Authentication required." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) {
      return json({ success: false, error: "Invalid session. Please sign in again." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: roleRows }, { data: staffRows }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userId),
      admin.from("store_staff").select("store_id, staff_role, status").eq("user_id", userId),
    ]);

    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin");
    const activeAssignments = (staffRows || []).filter((s: any) => s.status === "active");

    if (!isAdmin && activeAssignments.length === 0) {
      return json({ success: false, error: "You are not authorised to perform store operations." }, 403);
    }

    const body = await req.json();
    const action = String(body?.action || "");

    const canUseStore = (storeId: number) =>
      isAdmin || activeAssignments.some((s: any) => Number(s.store_id) === Number(storeId));

    // ---------------- Complete an in-store sale ----------------
    if (action === "pos_sale") {
      const storeId = Number(body.storeId);
      if (!storeId || !canUseStore(storeId)) {
        return json({ success: false, error: "You cannot sell for this store." }, 403);
      }

      const { data, error } = await admin.rpc("process_pos_sale", {
        p_store_id: storeId,
        p_staff_user_id: userId,
        p_customer_id: body.customerId || null,
        p_customer_name: body.customerName || "Walk-in Customer",
        p_customer_phone: body.customerPhone || null,
        p_customer_email: body.customerEmail || null,
        p_items: body.items || [],
        p_subtotal: Number(body.subtotal) || 0,
        p_discount_amount: Number(body.discountAmount) || 0,
        p_discount_type: body.discountType || "none",
        p_discount_value: Number(body.discountValue) || 0,
        p_approved_by: body.approvedBy || null,
        p_total_amount: Number(body.totalAmount) || 0,
        p_payments: body.payments || [],
        p_notes: body.notes || null,
      });

      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, ...data });
    }

    // ---------------- Void an in-store sale ----------------
    if (action === "void_sale") {
      const orderId = String(body.orderId || "");
      if (!orderId) return json({ success: false, error: "Order reference missing." }, 400);

      const { data: order } = await admin.from("orders").select("id, store_id").eq("id", orderId).maybeSingle();
      if (!order) return json({ success: false, error: "Order not found." }, 404);

      const managerOrAdmin =
        isAdmin ||
        activeAssignments.some(
          (s: any) => Number(s.store_id) === Number(order.store_id) && s.staff_role === "store_manager"
        );
      if (!managerOrAdmin) {
        return json({ success: false, error: "Only a store manager or administrator can void a sale." }, 403);
      }

      const { data, error } = await admin.rpc("void_pos_sale", {
        p_order_id: orderId,
        p_staff_user_id: userId,
        p_reason: body.reason || "No reason supplied",
      });
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, ...data });
    }

    // ---------------- Create a shipment ----------------
    if (action === "create_shipment") {
      const orderId = String(body.orderId || "");
      if (!orderId) return json({ success: false, error: "Order reference missing." }, 400);

      const { data: order } = await admin.from("orders").select("id, store_id").eq("id", orderId).maybeSingle();
      if (!order) return json({ success: false, error: "Order not found." }, 404);
      if (!canUseStore(Number(order.store_id))) {
        return json({ success: false, error: "You cannot fulfil orders for this store." }, 403);
      }

      const { data, error } = await admin.rpc("create_order_shipment", {
        p_order_id: orderId,
        p_carrier: body.carrier || "Standard Courier",
        p_tracking_number: body.trackingNumber || null,
        p_notes: body.notes || null,
        p_items: body.items || [],
        p_actor_name: body.actorName || "Store Staff",
        p_actor_id: userId,
      });
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, shipment_id: data });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error: unknown) {
    console.error("pos-operations error:", error);
    const msg = error instanceof Error ? error.message : "Unexpected error";
    return json({ success: false, error: msg }, 500);
  }
});
