import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Stable fingerprint of the generation inputs (photo bytes + products + colours). */
async function fingerprint(userImageBase64: string, products: any[]) {
  const normalised = products
    .map((p: any) => `${p.id || p.imageUrl || p.name}|${(p.color || '').toLowerCase()}`)
    .sort()
    .join(';');
  const data = new TextEncoder().encode(`${userImageBase64}::${normalised}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  const contentType = match?.[1] || "image/png";
  const base64 = match?.[2] || dataUrl.replace(/^data:[^,]+,/, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let generationId: string | null = null;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ---- 1. Authentication (credits belong to a registered user) ----
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        if (claimsData?.claims) userId = claimsData.claims.sub as string;
      } catch (_e) {
        userId = null;
      }
    }
    if (!userId) {
      return json({ error: "Please sign in to use Fit Me AI.", code: "auth_required" }, 401);
    }

    const { userImageBase64, products: productsList, productImageUrl, productName, selectedColor } = await req.json();

    // Support both new multi-product and legacy single-product format
    const products = productsList || [{ imageUrl: productImageUrl, name: productName, color: selectedColor }];

    if (!userImageBase64 || !products?.length) {
      return json({ error: "User image and at least one product are required" }, 400);
    }

    // ---- 2. Reserve exactly 1 credit atomically (or reuse a cached result) ----
    const inputHash = await fingerprint(userImageBase64, products);
    const productIds = products.map((p: any) => p.id).filter(Boolean);

    const { data: reservation, error: reserveError } = await admin.rpc("fitme_reserve_credit", {
      p_user_id: userId,
      p_input_hash: inputHash,
      p_product_ids: productIds,
    });

    if (reserveError) {
      console.error("fitme_reserve_credit failed:", reserveError);
      return json({ error: "Could not check your Fit Me Credits. Please try again." }, 500);
    }

    if (!reservation?.allowed) {
      if (reservation?.reason === "insufficient_credits") {
        return json({
          error: "You're out of Fit Me Credits",
          code: "insufficient_credits",
          current_balance: reservation?.current_balance ?? 0,
        }, 402);
      }
      return json({ error: "Fit Me is unavailable for this account.", code: reservation?.reason }, 403);
    }

    // Identical look already generated → serve it again for free
    if (reservation.cached && reservation.result_url) {
      const { data: signed } = await admin.storage
        .from("fitme-results")
        .createSignedUrl(reservation.result_url, 60 * 60 * 24);
      return json({
        image: signed?.signedUrl || null,
        cached: true,
        credits_charged: 0,
        generation_id: reservation.generation_id,
      });
    }

    generationId = reservation.generation_id as string;

    // ---- 3. Existing AI provider integration (unchanged) ----
    const productDescriptions = products.map((p: any, i: number) =>
      `Item ${i + 1}: "${p.name}"${p.color ? ` in ${p.color}` : ''}`
    ).join(', ');

    const prompt = `You are a virtual fashion try-on AI. Your ONLY task is to take the person from the FIRST image and digitally dress them in ALL the clothing items shown in the following images. The items are: ${productDescriptions}. CRITICAL RULES: 1) You MUST use the EXACT design, pattern, logo, print, and style from each product image — do NOT invent or substitute any clothing. 2) Combine all selected items into one cohesive outfit on the person. 3) Keep the person's face, skin tone, body shape, and pose identical. 4) Only replace their clothing with the products from the images. 5) The result must look like a realistic photo of the person wearing all the selected items together. Generate only the final image, no text.`;

    const imageContents = [
      { type: "image_url", image_url: { url: userImageBase64 } },
      ...products.map((p: any) => ({ type: "image_url", image_url: { url: p.imageUrl } })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContents,
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      await admin.rpc("fitme_fail_generation", {
        p_generation_id: generationId,
        p_error: `Provider error ${response.status}`,
      });

      if (response.status === 429) {
        return json({ error: "Too many requests right now. Your credit was refunded — please try again in a moment.", refunded: true }, 429);
      }
      if (response.status === 402) {
        return json({ error: "The AI service is temporarily unavailable. Your credit was refunded.", refunded: true }, 402);
      }
      return json({ error: "AI processing failed. Your credit was refunded — please try again.", refunded: true }, 500);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const generatedImage = message?.images?.[0]?.image_url?.url
      || message?.images?.[0]?.url
      || message?.images?.[0]
      || (typeof message?.content === 'string' && message.content.startsWith('data:') ? message.content : null);
    const textResponse = typeof message?.content === 'string' && !message.content.startsWith('data:') ? message.content : null;

    if (!generatedImage || typeof generatedImage !== "string") {
      await admin.rpc("fitme_fail_generation", {
        p_generation_id: generationId,
        p_error: "No image returned by provider",
      });
      return json({
        error: "AI could not generate the image. Your credit was refunded — try a different photo.",
        refunded: true,
        text: textResponse,
      }, 422);
    }

    // ---- 4. Persist the result so repeats are free ----
    let storedPath: string | null = null;
    let signedUrl: string | null = null;
    try {
      const { bytes, contentType } = dataUrlToBytes(generatedImage);
      const ext = contentType.includes("jpeg") ? "jpg" : "png";
      storedPath = `${userId}/${generationId}.${ext}`;
      const { error: uploadError } = await admin.storage
        .from("fitme-results")
        .upload(storedPath, bytes, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: signed } = await admin.storage
        .from("fitme-results")
        .createSignedUrl(storedPath, 60 * 60 * 24);
      signedUrl = signed?.signedUrl || null;
    } catch (storeErr) {
      console.error("Fit Me result storage failed (serving inline):", storeErr);
      storedPath = null;
    }

    if (storedPath) {
      await admin.rpc("fitme_complete_generation", {
        p_generation_id: generationId,
        p_result_url: storedPath,
        p_provider_generation_id: data?.id || null,
      });
    } else {
      // Result produced but not cacheable — still a successful, consumed generation
      await admin.rpc("fitme_complete_generation", {
        p_generation_id: generationId,
        p_result_url: null,
        p_provider_generation_id: data?.id || null,
      });
    }

    return json({
      image: signedUrl || generatedImage,
      text: textResponse,
      cached: false,
      credits_charged: 1,
      generation_id: generationId,
    });
  } catch (error) {
    console.error("fit-me-ai error:", error);
    if (generationId) {
      try {
        await admin.rpc("fitme_fail_generation", {
          p_generation_id: generationId,
          p_error: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (_e) { /* non-fatal */ }
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json({ error: errorMessage, refunded: Boolean(generationId) }, 500);
  }
});
