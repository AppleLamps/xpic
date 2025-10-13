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
    const { handle } = await req.json();

    if (!handle) {
      console.error("No handle provided");
      return new Response(
        JSON.stringify({ error: "X handle is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const xaiApiKey = Deno.env.get("XAI_API_KEY");
    if (!xaiApiKey) {
      console.error("XAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "XAI_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Analyzing X account: @${handle}`);

    const systemPrompt = `You are an expert at analyzing social media accounts and creating creative, humorous image generation prompts. Your task is to:

1. Analyze the X posts from the given account
2. Identify the key themes, topics, personality traits, and communication style
3. Create a single, detailed image generation prompt that captures the essence of the account in a humorous but relevant way

The image prompt should:
- Be creative and visually interesting
- Incorporate the main themes/topics of the account
- Have a humorous or satirical edge that relates to their posting style
- Be specific about visual elements (setting, objects, style, mood, colors)
- Be suitable for image generation (describe a scene, not abstract concepts)
- Be 2-3 sentences maximum
- Use vivid, descriptive language

Examples of good prompts:
- "A tech CEO sitting on a throne made of smartphones and circuit boards, surrounded by floating holographic charts, in a futuristic office with floor-to-ceiling windows showing Mars in the background, digital art style"
- "A coffee cup with steam forming the shape of code symbols, sitting on a desk covered in sticky notes with bug reports, warm lighting, cozy developer aesthetic, photorealistic"
- "A motivational speaker standing on a mountain peak made of self-help books, arms raised triumphantly, sunrise in background, inspirational poster style with vibrant colors"

Return ONLY the image generation prompt, nothing else. No explanations, no preamble, just the prompt.`;

    // Call xAI Grok API with search enabled for X posts
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze @${handle}'s posts and create a humorous but relevant image generation prompt that captures their account's essence.`,
          },
        ],
        search_parameters: {
          mode: "on",
          sources: [
            { 
              type: "x", 
              x_handles: [handle] 
            }
          ],
          return_citations: true
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("xAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `xAI API error: ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const imagePrompt = data.choices?.[0]?.message?.content;

    if (!imagePrompt) {
      console.error("No prompt generated from Grok");
      return new Response(
        JSON.stringify({ error: "Failed to generate image prompt" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generated prompt:", imagePrompt);

    return new Response(JSON.stringify({ imagePrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-account function:", error);
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
