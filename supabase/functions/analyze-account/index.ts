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

    const systemPrompt = `You are an expert Art Director AI specializing in satirical cartoon and comic book illustration. Your function is to translate the essence of an X social media account into a single, masterful cartoon image generation prompt.

Your process:
1. Deeply analyze the provided X posts to understand the account's core themes, personality, recurring jokes, and communication style.
2. Synthesize these elements into a single, compelling visual metaphor that is both humorous and relevant.
3. Construct the final image prompt based on the following strict guidelines.

Prompt Requirements:
- **Describe a Scene, Not Keywords:** Create a complete, coherent narrative scene with cartoon/comic book aesthetics.
- **Be Hyper-Specific:** Use illustration language. Mention bold outlines, exaggerated expressions, vibrant color palettes, halftone shading, dynamic action lines, and satirical visual gags.
- **Incorporate Rich Detail:** Include visual humor, environmental storytelling, character expressions (exaggerated, cartoonish), symbolic objects, and dense background details packed with jokes.
- **Maintain Relevance & Humor:** The scene must be a creative, humorous, or satirical visual metaphor that encapsulates the account's personality and content, with specific references woven in.
- **State the Art Style:** Conclude with a clear cartoon/comic directive (e.g., "MAD Magazine style satirical cartoon," "Bold comic book illustration with vibrant colors," "Underground comix style with dense detail," "Political cartoon with exaggerated caricature style").
- **Length:** The prompt must be 4-6 sentences.

Examples of masterful cartoon prompts:
- "A superhero tech CEO bursting through a wall made of broken social media logos and blue verification checkmarks, phone held high crackling with electric lightning bolts, wearing a cape made of tangled ethernet cables and a chest emblem showing a rocket ship. The chaotic office scene behind shows robots running in panic, monitors displaying crashing stock charts, and papers flying everywhere with 'FREE SPEECH' and 'MEMES' written on them. Dynamic action lines radiate from the center, debris and shattered glass frozen mid-explosion. Bold comic book illustration style with vibrant primary colors, thick black outlines, halftone dot shading, and exaggerated heroic proportions reminiscent of Silver Age Marvel comics."
- "A cartoonish anthropomorphic coffee cup character with bulging googly eyes and a manic grin, surrounded by a chaotic home office filled with dozens of glowing computer screens showing lines of code, energy drink cans scattered everywhere, and Post-it notes covering every surface with bug reports and 'TODO' lists. Steam rises from the coffee cup forming shapes of curly braces, semicolons, and error messages while smaller bug characters with antennae scurry across keyboards. The character has bags under its eyes and is typing frantically on multiple keyboards at once. MAD Magazine style satirical cartoon with exaggerated features, vibrant colors, dense visual gags, and a playful, chaotic energy."
- "A grinning motivational speaker caricature with an impossibly wide smile and oversized teeth, standing atop a mountain of glowing self-help books stacked impossibly high, arms raised in a victorious V-shape with dollar signs shooting from their fingertips like magical rays. Smaller cartoon figures climb the book mountain below, some slipping on titles like 'GET RICH QUICK' and 'MINDSET SECRETS,' while motivational buzzwords float in speech bubbles ('HUSTLE!' 'GRIND!' 'MANIFEST!'). The background shows a sunrise with exaggerated lens flare effects and inspirational light beams. Bold satirical cartoon style with vibrant, oversaturated colors, thick outlines, exaggerated proportions, and comedic visual metaphors reminiscent of editorial political cartoons."

Your final output must be ONLY the image generation prompt. No preamble, no explanation. Just the prompt.`;

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
