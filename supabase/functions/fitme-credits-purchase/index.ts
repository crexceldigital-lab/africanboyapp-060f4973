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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Authenticated users only — credits are always tied to an account
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    let userEmail: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        if (claimsData?.claims) {
          userId = claimsData.claims.sub as string;
          userEmail = (claimsData.claims.email as string) || null;
        }
      } catch (_e) {
        userId = null;
      }
    }
    if (!userId) {
      return json({ success: false, error: "Please sign in to buy Fit Me Credits.", code: "auth_required" }, 401);
    }

    const { packageCode, packageId, customerName, customerPhone, redirectUrl } = await req.json();

    // Package price/credits always come from the database — never from the browser
    let query = admin.from("fitme_credit_packages").select("*").eq("is_active", true).limit(1);
    query = packageId ? query.eq("id", packageId) : query.eq("code", packageCode);
    const { data: pkg, error: pkgError } = await query.maybeSingle();

    if (pkgError || !pkg) return json({ success: false, error: "Credit package not found." }, 404);
    if (pkg.is_free || Number(pkg.price) <= 0) {
      return json({ success: false, error: "Free credits are issued automatically to new accounts." }, 400);
    }

    const { data: purchase, error: purchaseError } = await admin
      .from("fitme_credit_purchases")
      .insert({
        user_id: userId,
        package_id: pkg.id,
        credits: pkg.credits,
        amount: Number(pkg.price),
        currency: pkg.currency || "TZS",
        status: "PENDING",
      })
      .select()
      .single();

    if (purchaseError || !purchase) throw new Error(purchaseError?.message || "Could not start the purchase.");

    const SNIPPE_API_KEY = Deno.env.get("SNIPPE_API_KEY");
    if (!SNIPPE_API_KEY) {
      return json({
        success: false,
        purchase_id: purchase.id,
        error: "Payments are not configured yet. Please try again later.",
      }, 503);
    }

    // Snippe settles in TZS only — never silently convert
    const allowedMethods = (Deno.env.get("SNIPPE_ALLOWED_METHODS") || "mobile_money")
      .split(",").map((m) => m.trim()).filter(Boolean);
    const projectId = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/snippe-webhook`;

    const snippeRes = await fetch("https://api.snippe.sh/api/v1/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${SNIPPE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(Number(pkg.price)),
        currency: "TZS",
        allowed_methods: allowedMethods,
        customer: { name: customerName || "", phone: customerPhone || "", email: userEmail || "" },
        redirect_url: redirectUrl || "",
        webhook_url: webhookUrl,
        description: `Fit Me Credits — ${pkg.name} (${pkg.credits} credits)`,
        metadata: {
          type: "fitme_credits",
          purchase_id: purchase.id,
          user_id: userId,
          package_code: pkg.code,
          credits: pkg.credits,
        },
        expires_in: 3600,
        line_items: [{ name: `${pkg.name} — ${pkg.credits} Fit Me Credits`, quantity: 1, amount: Math.round(Number(pkg.price)) }],
      }),
    });

    const snippeData = await snippeRes.json();

    if (!snippeRes.ok) {
      await admin.from("fitme_credit_purchases")
        .update({ status: "FAILED", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);

      const gatewayMsg = String(snippeData?.message || "");
      const friendly = /country we collect in/i.test(gatewayMsg)
        ? "Payments are currently accepted with a Tanzanian, Kenyan or Ugandan mobile number. Please use a mobile money number from one of these countries."
        : `Payment could not be started. ${gatewayMsg || `Gateway error ${snippeRes.status}`}`;
      return json({ success: false, error: friendly }, 400);
    }

    const session = snippeData.data;
    await admin.from("fitme_credit_purchases")
      .update({
        payment_reference: session.reference,
        checkout_url: session.checkout_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);

    return json({
      success: true,
      checkout_url: session.checkout_url,
      reference: session.reference,
      purchase_id: purchase.id,
      credits: pkg.credits,
    });
  } catch (error) {
    console.error("fitme-credits-purchase error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
