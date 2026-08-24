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

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const callerId = claimsData.claims.sub as string;

    // 2. Verify caller has global admin role in user_roles
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify user permissions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const isGlobalAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isGlobalAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Global admin privilege required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // 3. Process Request Body
    const body = await req.json().catch(() => ({}));
    const { email, user_ids } = body;

    // Case A: Batch lookup by user_ids (for staff list display)
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const { data: authData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) throw listErr;

      const userSet = new Set(user_ids);
      const matchedUsers = (authData.users || [])
        .filter((u) => userSet.has(u.id))
        .map((u) => ({
          user_id: u.id,
          email: u.email || "",
          full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.display_name || null,
        }));

      return new Response(
        JSON.stringify({ users: matchedUsers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Case B: Lookup single user by email (for assigning new staff)
    if (email && typeof email === "string") {
      const searchEmail = email.trim().toLowerCase();
      const { data: authData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) throw listErr;

      const foundUser = (authData.users || []).find(
        (u) => u.email && u.email.trim().toLowerCase() === searchEmail
      );

      if (!foundUser) {
        return new Response(
          JSON.stringify({
            found: false,
            message: "No account found for that email",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const fullName = foundUser.user_metadata?.full_name || foundUser.user_metadata?.name || foundUser.user_metadata?.display_name || null;

      return new Response(
        JSON.stringify({
          found: true,
          user_id: foundUser.id,
          email: foundUser.email,
          full_name: fullName,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Missing required parameter: email or user_ids" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (err: any) {
    console.error("Lookup user error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
