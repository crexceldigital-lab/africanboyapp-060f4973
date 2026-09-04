/**
 * Resolves a Google place ID into a formatted address plus latitude/longitude.
 * Used after address autocomplete so orders can later support delivery-zone
 * and distance calculations. Credentials stay server-side (connector gateway).
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
    const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
    if (!placeId || placeId.length > 300 || /[^\w\-:.]/.test(placeId)) {
      return new Response(JSON.stringify({ error: "Invalid placeId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${GATEWAY_URL}/places/v1/places/${placeId}`, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Place details failed [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: "Place lookup failed", status: res.status, details: text }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const place = JSON.parse(text || "{}");
    return new Response(
      JSON.stringify({
        placeId: place.id ?? placeId,
        formattedAddress: place.formattedAddress ?? "",
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("place-details error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
