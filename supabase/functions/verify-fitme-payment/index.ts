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

    // Authenticate caller
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        if (claimsData?.claims) {
          userId = claimsData.claims.sub as string;
        }
      } catch (_e) {
        userId = null;
      }
    }

    const { reference, purchaseId } = await req.json();

    if (!reference && !purchaseId) {
      return json({ success: false, error: "Reference or purchaseId is required." }, 400);
    }

    // Lookup purchase record
    let query = admin.from("fitme_credit_purchases").select("*");
    if (reference) {
      query = query.eq("payment_reference", reference);
    } else if (purchaseId) {
      query = query.eq("id", purchaseId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: purchase, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !purchase) {
      return json({ success: false, status: "NOT_FOUND", error: "Credit purchase record not found." }, 404);
    }

    // 1. If already marked PAID in DB
    if (purchase.status === "PAID") {
      return json({
        success: true,
        status: "PAID",
        credits: purchase.credits,
        reference: purchase.payment_reference,
        already_credited: true,
      });
    }

    // 2. If marked FAILED or CANCELLED in DB
    if (purchase.status === "FAILED" || purchase.status === "CANCELLED") {
      return json({
        success: false,
        status: purchase.status,
        reference: purchase.payment_reference,
      });
    }

    // 3. If PENDING, check Snippe Gateway API directly for real-time verification
    const SNIPPE_API_KEY = Deno.env.get("SNIPPE_API_KEY");
    if (SNIPPE_API_KEY && purchase.payment_reference) {
      try {
        const snippeRes = await fetch(`https://api.snippe.sh/api/v1/sessions/${purchase.payment_reference}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${SNIPPE_API_KEY}`, "Content-Type": "application/json" },
        });

        if (snippeRes.ok) {
          const snippeData = await snippeRes.json();
          const session = snippeData?.data || snippeData;
          const status = String(session?.status || "").toLowerCase();

          if (status === "completed" || status === "paid") {
            const { error: rpcErr } = await admin.rpc("fitme_credit_purchase_paid", {
              p_reference: purchase.payment_reference,
              p_amount: session?.amount ? Number(session.amount) : purchase.amount,
            });

            if (!rpcErr) {
              return json({
                success: true,
                status: "PAID",
                credits: purchase.credits,
                reference: purchase.payment_reference,
                verified_by_gateway: true,
              });
            }
          } else if (status === "failed" || status === "cancelled" || status === "expired" || status === "voided") {
            await admin.rpc("fitme_credit_purchase_failed", {
              p_reference: purchase.payment_reference,
              p_status: status === "cancelled" || status === "voided" ? "cancelled" : "failed",
            });
            return json({
              success: false,
              status: status.toUpperCase(),
              reference: purchase.payment_reference,
            });
          }
        }
      } catch (gatewayErr) {
        console.warn("Gateway direct verification failed, returning DB status:", gatewayErr);
      }
    }

    // Return current DB status if pending
    return json({
      success: true,
      status: purchase.status || "PENDING",
      reference: purchase.payment_reference,
      credits: purchase.credits,
    });
  } catch (error) {
    console.error("verify-fitme-payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
