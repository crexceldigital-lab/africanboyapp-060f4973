import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { userImageBase64, products: productsList, productImageUrl, productName, selectedColor } = await req.json();

    // Support both new multi-product and legacy single-product format
    const products = productsList || [{ imageUrl: productImageUrl, name: productName, color: selectedColor }];

    if (!userImageBase64 || !products?.length) {
      return new Response(JSON.stringify({ error: "User image and at least one product are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI processing failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(data?.choices?.[0]?.message, null, 2)?.substring(0, 500));
    
    // Try multiple possible response formats
    const message = data.choices?.[0]?.message;
    const generatedImage = message?.images?.[0]?.image_url?.url 
      || message?.images?.[0]?.url
      || message?.images?.[0]
      || (typeof message?.content === 'string' && message.content.startsWith('data:') ? message.content : null);
    const textResponse = typeof message?.content === 'string' && !message.content.startsWith('data:') ? message.content : null;

    if (!generatedImage) {
      return new Response(JSON.stringify({ error: "AI could not generate the image. Try a different photo.", text: textResponse }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ image: generatedImage, text: textResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fit-me-ai error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
