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

    const systemPrompt = `You are an expert at analyzing social media accounts and creating highly detailed, creative, humorous image generation prompts. Your task is to:

1. Analyze the X posts from the given account in depth
2. Identify the key themes, topics, personality traits, and communication style
3. Create a single, extremely detailed image generation prompt that captures the essence of the account in a humorous but relevant way

The image prompt should:
- Be creative and visually interesting with rich detail
- Incorporate the main themes/topics of the account with specific references
- Have a humorous or satirical edge that relates to their posting style
- Be highly specific about visual elements (setting, objects, style, mood, colors, lighting, composition, textures)
- Include atmospheric details, character expressions, and environmental context
- Be suitable for image generation (describe a concrete scene with vivid imagery)
- Be 4-6 sentences long to capture maximum detail
- Use extremely vivid, descriptive language with sensory details
- Include art style direction (e.g., "photorealistic", "digital art", "cinematic", "surreal painting style")

Examples of good detailed prompts:
- "A tech CEO sitting majestically on an elaborate throne crafted entirely from smartphones, circuit boards, and tangled charging cables, surrounded by floating holographic charts displaying crypto prices and stock tickers in electric blue and green hues. The futuristic corner office features floor-to-ceiling windows revealing a red Mars landscape in the distance, while robotic assistants scurry about organizing paperwork. Dramatic side lighting creates long shadows across the polished titanium floor, and the CEO wears a confident smirk while typing on a holographic keyboard. Digital art style with cyberpunk influences and sharp, high-contrast lighting."

- "A large ceramic coffee cup with aromatic steam rising and magically forming the shapes of code symbols, brackets, and debug messages in the air above it, sitting prominently on a cluttered developer desk covered in colorful sticky notes with hastily written bug reports and TODO lists. The warm, golden hour lighting streams through venetian blinds creating striped patterns across the workspace, illuminating a mechanical keyboard, multiple monitors displaying terminal windows, and a well-worn programming book. The scene has a cozy, lived-in aesthetic with soft bokeh in the background, capturing the intimate atmosphere of late-night coding sessions. Photorealistic style with shallow depth of field and cinematic warm tones."

- "A charismatic motivational speaker standing triumphantly at the peak of an enormous mountain constructed entirely from towering stacks of self-help books with gleaming gold-embossed titles, their arms raised high toward the heavens in a victorious pose. The dramatic sunrise behind them bathes the scene in brilliant oranges, pinks, and purples, casting long inspirational rays of light through wispy clouds. Smaller figures can be seen climbing the book mountain below, reaching upward toward success. The speaker wears an immaculate suit that billows in the mountaintop wind, and their expression radiates confidence and determination. Inspirational poster style with vibrant, saturated colors, lens flare effects, and an epic, larger-than-life composition."

Return ONLY the image generation prompt, nothing else. No explanations, no preamble, just the detailed prompt.`;

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
