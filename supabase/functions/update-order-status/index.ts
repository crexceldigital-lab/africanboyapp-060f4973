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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Verify caller JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return new Response(
        JSON.stringify({ error: "orderId and status are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Check if user is global admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isGlobalAdmin = roles?.some((r: { role: string }) => r.role === "admin");

    // 3. If not global admin, verify store_staff assignment
    let staffStoreId: number | null = null;
    if (!isGlobalAdmin) {
      const { data: staff } = await supabaseAdmin
        .from("store_staff")
        .select("store_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!staff) {
        return new Response(
          JSON.stringify({ error: "User is not assigned to any store staff role" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      staffStoreId = staff.store_id;
    }

    // 4. Fetch order and check store_id
    const { data: order, error: orderFetchError } = await supabaseAdmin
      .from("orders")
      .select("id, store_id")
      .eq("id", orderId)
      .single();

    if (orderFetchError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!isGlobalAdmin && order.store_id !== staffStoreId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different store" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // 5. Update order status using service role
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, order_id: orderId, new_status: status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Update order status error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
