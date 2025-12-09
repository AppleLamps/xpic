import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Premium image model (easy to change back if needed)
// Supported Google models: "google/gemini-2.5-flash-image", "google/gemini-3-pro-image-preview"
const PREMIUM_IMAGE_MODEL = "google/gemini-2.5-flash-image";

// Check if the current model is a Google model (for prompt enhancement)
const isGoogleModel = (model: string): boolean => model.startsWith("google/");

// Enhanced prompt wrapper for Google models - these models benefit from more detailed instructions
const enhancePromptForGoogleModels = (basePrompt: string): string => {
  const enhancementInstructions = `You are an expert illustrator creating a satirical cartoon. Generate an image based on this description:

${basePrompt}

CRITICAL ARTISTIC REQUIREMENTS:
- COMPOSITION: Use a dynamic camera angle (low angle for power, Dutch angle for chaos, or dramatic perspective). Ensure the main subject is prominent with supporting details filling the space.
- LIGHTING: Apply dramatic lighting that enhances the mood—consider rim lighting for drama, flat comic book lighting for pop art feel, or noir shadows for edge.
- ACTION & ENERGY: The scene should feel alive with movement—use dynamic poses, action lines, flying debris, or motion blur effects.
- RICH DETAILS: Pack the background with easter eggs, visual jokes, and symbolic objects that tell the story. Every corner should reward closer inspection.
- EXAGGERATION: Push proportions, expressions, and reactions to cartoonish extremes. Subtlety is the enemy of great satire.
- COLOR PALETTE: Use bold, vibrant colors with strong contrast. Consider complementary color schemes for visual impact.
- STYLE CONSISTENCY: Maintain the specified art style throughout—thick outlines, halftone dots, or whatever the prompt specifies.

Generate this as a single, cohesive satirical cartoon illustration.`;

  return enhancementInstructions;
};

// Create user identifier from IP + User-Agent for anonymous tracking
const getUserIdentifier = async (req: Request): Promise<string> => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Create hash to anonymize
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + userAgent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Check usage and determine which model to use
const checkUsageAndGetModel = async (identifier: string) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Get or create usage record
  let { data: usage, error } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_identifier", identifier)
    .maybeSingle();

  const now = new Date();
  const resetNeeded = !usage || now.getTime() - new Date(usage.last_reset_at).getTime() > 24 * 60 * 60 * 1000;

  if (!usage) {
    // Create new record
    const { data: newUsage } = await supabase
      .from("usage_tracking")
      .insert({
        user_identifier: identifier,
        premium_images_count: 0,
        last_reset_at: now.toISOString(),
      })
      .select()
      .maybeSingle();
    usage = newUsage;
  } else if (resetNeeded) {
    // Reset counter after 24h
    const { data: resetUsage } = await supabase
      .from("usage_tracking")
      .update({
        premium_images_count: 0,
        last_reset_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_identifier", identifier)
      .select()
      .maybeSingle();
    usage = resetUsage;
  }

  const usePremium = (usage?.premium_images_count || 0) < 2;

  console.log(
    `User identifier: ${identifier.substring(0, 8)}... | Premium count: ${usage?.premium_images_count || 0}/2 | Using: ${usePremium ? "Nano Banana (premium)" : "Flux (standard)"}`,
  );

  return { usePremium, usage, supabase };
};

// Generate with Flux (GetImg.ai) - cheaper fallback
const generateWithFlux = async (prompt: string): Promise<string> => {
  const getimgApiKey = Deno.env.get("GETIMG_API_KEY");
  if (!getimgApiKey) {
    throw new Error("GETIMG_API_KEY is not configured");
  }

  console.log("Using Flux Schnell model (GetImg.ai)");

  const response = await fetch("https://api.getimg.ai/v1/flux-schnell/text-to-image", {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${getimgApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      width: 1024,
      height: 1024,
      steps: 4,
      output_format: "jpeg",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("GetImg.ai API error:", response.status, errorText);
    throw new Error(`GetImg.ai API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("GetImg.ai response:", JSON.stringify(data));

  // GetImg.ai returns base64 image in the "image" field
  const imageUrl = data.image || data.url || data.data?.[0]?.url;

  if (!imageUrl) {
    console.error("No image in GetImg.ai response. Full data:", data);
    throw new Error("GetImg.ai did not return an image");
  }

  console.log("Flux image generated successfully");
  return imageUrl;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, handle } = await req.json();

    // Validate X handle format (1-15 alphanumeric characters + underscores)
    const HANDLE_REGEX = /^[a-zA-Z0-9_]{1,15}$/;
    if (!handle || !HANDLE_REGEX.test(handle)) {
      console.error("Invalid handle format:", handle);
      return new Response(
        JSON.stringify({
          error:
            "Invalid X handle format. Handles must be 1-15 characters and contain only letters, numbers, and underscores.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!prompt) {
      console.error("Missing prompt");
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user identifier for rate limiting
    const userIdentifier = await getUserIdentifier(req);

    // Check usage and determine model
    const { usePremium, usage, supabase } = await checkUsageAndGetModel(userIdentifier);

    let imageUrl: string;

    if (usePremium) {
      // Use premium Nano Banana model (OpenRouter)
      const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
      if (!openrouterApiKey) {
        console.error("OPENROUTER_API_KEY is not configured");
        return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Attempt premium image generation with retry logic
      const attemptImageGeneration = async (currentPrompt: string, isRetry: boolean): Promise<string> => {
        console.log(`Attempting premium image generation (retry: ${isRetry})`);
        console.log(`Using premium model (OpenRouter): ${PREMIUM_IMAGE_MODEL}`);
        
        // Enhance the prompt for Google models - they benefit from more detailed instructions
        // Works with: google/gemini-2.5-flash-image, google/gemini-3-pro-image-preview, etc.
        const finalPrompt = isGoogleModel(PREMIUM_IMAGE_MODEL) 
          ? enhancePromptForGoogleModels(currentPrompt)
          : currentPrompt;
        
        console.log(`Using ${isGoogleModel(PREMIUM_IMAGE_MODEL) ? "enhanced" : "standard"} prompt:`, finalPrompt);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://x-image-generator.lovable.app",
            "X-Title": "X Account Image Generator",
          },
          body: JSON.stringify({
            model: PREMIUM_IMAGE_MODEL,
            messages: [
              {
                role: "user",
                content: finalPrompt,
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
          const analyzeResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-account`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              handle: handle,
              useSafetyGuidelines: true,
            }),
          });

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

        console.log("Premium image generated successfully");
        return imageUrl;
      };

      // Generate premium image
      imageUrl = await attemptImageGeneration(prompt, false);

      // Increment premium counter
      await supabase
        .from("usage_tracking")
        .update({
          premium_images_count: (usage?.premium_images_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_identifier", userIdentifier);

      console.log(`Premium image generated. User now at ${(usage?.premium_images_count || 0) + 1}/2 premium images`);
    } else {
      // Use standard Flux model (GetImg.ai)
      imageUrl = await generateWithFlux(prompt);
      console.log("Standard Flux image generated. User has used their premium quota.");
    }

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
      },
    );
  }
});
