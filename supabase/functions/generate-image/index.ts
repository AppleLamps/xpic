import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, handle } = await req.json();

    if (!prompt || !handle) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Both prompt and handle are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      console.error("OPENROUTER_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Attempt image generation with retry logic
    const attemptImageGeneration = async (
      currentPrompt: string,
      isRetry: boolean
    ): Promise<string> => {
      console.log(`Attempting image generation (retry: ${isRetry})`);
      console.log("Using prompt:", currentPrompt);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://x-image-generator.lovable.app",
          "X-Title": "X Account Image Generator",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: currentPrompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("OpenRouter response:", JSON.stringify(data, null, 2));

      // Check for safety block
      const finishReason = data.choices?.[0]?.native_finish_reason;
      if (finishReason === "IMAGE_SAFETY") {
        if (isRetry) {
          console.error("Image blocked by safety even after regenerating with guidelines");
          throw new Error("Content cannot be safely generated - blocked by safety filters");
        }

        console.log("Safety block detected - regenerating prompt with safety guidelines");

        // Call analyze-account again with safety guidelines enabled
        const analyzeResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-account`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              handle: handle,
              useSafetyGuidelines: true,
            }),
          }
        );

        if (!analyzeResponse.ok) {
          console.error("Failed to regenerate prompt");
          throw new Error("Failed to regenerate safe prompt");
        }

        const { imagePrompt: safePrompt } = await analyzeResponse.json();
        console.log("Regenerated safe prompt:", safePrompt);

        // Retry with the new, safer prompt
        return attemptImageGeneration(safePrompt, true);
      }

      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        console.error("No image URL in response:", data);
        throw new Error("Failed to generate image - no image URL in response");
      }

      console.log("Generated image URL:", imageUrl.substring(0, 100) + "...");
      return imageUrl;
    };

    // Start the image generation process
    const imageUrl = await attemptImageGeneration(prompt, false);

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
