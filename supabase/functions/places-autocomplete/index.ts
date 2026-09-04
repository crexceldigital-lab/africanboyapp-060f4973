/**
 * Google Places (New) address autocomplete proxy.
 *
 * The Google Maps credentials stay server-side: this function calls the Lovable
 * connector gateway, so no Maps key is ever shipped to the browser (which also
 * means it works on the custom domain, unlike a referrer-restricted browser key).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps connector is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const input = typeof body.input === "string" ? body.input.trim().slice(0, 120) : "";
    // Bounded usage: ignore very short queries so typing does not fan out to Google.
    if (input.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const regionCode = typeof body.regionCode === "string" && /^[A-Za-z]{2}$/.test(body.regionCode)
      ? body.regionCode.toUpperCase()
      : "TZ";

    const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: [regionCode],
        languageCode: "en",
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Places autocomplete failed [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: "Address lookup failed", status: res.status, details: text }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = JSON.parse(text || "{}");
    const suggestions = (data.suggestions ?? [])
      .slice(0, 5)
      .map((s: any) => ({
        placeId: s?.placePrediction?.placeId ?? null,
        description: s?.placePrediction?.text?.text ?? "",
      }))
      .filter((s: any) => s.description);

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("places-autocomplete error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
