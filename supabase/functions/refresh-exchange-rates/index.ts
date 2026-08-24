import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch live TZS rates from open exchange rates API
    const res = await fetch("https://open.er-api.com/v6/latest/TZS");
    if (!res.ok) throw new Error(`FX API HTTP Error: ${res.status}`);

    const fxData = await res.json();
    const rates: Record<string, number> = fxData.rates || {};

    // Fetch list of active countries from DB
    const { data: countries } = await supabaseAdmin
      .from("countries")
      .select("currency_code")
      .eq("is_active", true);

    const targetCurrencies = new Set<string>();
    targetCurrencies.add("TZS");
    countries?.forEach((c: { currency_code: string }) => targetCurrencies.add(c.currency_code));

    const upserts = [];
    for (const currencyCode of targetCurrencies) {
      const rate = rates[currencyCode] || (currencyCode === "TZS" ? 1 : null);
      if (rate !== null) {
        upserts.push({
          from_currency: "TZS",
          to_currency: currencyCode,
          rate: rate,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("exchange_rates")
        .upsert(upserts, { onConflict: "from_currency,to_currency" });

      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({ success: true, updated_rates: upserts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Refresh exchange rates error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
