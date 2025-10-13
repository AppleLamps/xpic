import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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
    const { handle, useSafetyGuidelines } = await req.json();

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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache for existing search results
    const { data: cachedData, error: cacheError } = await supabase
      .from('x_account_cache')
      .select('search_response')
      .eq('x_handle', handle.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cacheError) {
      console.error("Cache lookup error:", cacheError);
    }

    let systemPrompt = `You are an expert Art Director AI specializing in satirical cartoon and comic book illustration. Your function is to translate the essence of an X social media account into a single, masterful cartoon image generation prompt.

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

    // Add safety guidelines if requested
    if (useSafetyGuidelines) {
      systemPrompt += `\n\nContent Guidelines:
- **Stay Clever, Not Explicit:** Use visual metaphors, symbolism, and satirical imagery rather than explicit offensive terminology.
- **No Explicit Slurs or Graphic Violence:** Avoid terms related to sexual misconduct, extreme violence, hate speech slurs, or graphic descriptions of harm.
- **Controversy Through Imagery:** Capture controversial themes through symbolic representation (e.g., use clashing symbols, opposing forces, visual tension) rather than direct offensive language.
- **Satirical ≠ Offensive:** Great satire can be biting and edgy through clever visual choices, exaggerated caricature, and absurdist humor without explicit offensive content.`;
    }

    let imagePrompt: string;

    // If we have cached data, use it to generate a new prompt without search
    if (cachedData?.search_response) {
      console.log(`Cache hit for @${handle}, generating fresh prompt from cached data`);

      const cachedContext = JSON.stringify(cachedData.search_response);

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
              content: `Based on this X account data: ${cachedContext}\n\nCreate a humorous but relevant image generation prompt that captures the account's essence.`,
            },
          ],
          // No search_parameters - we're using cached data
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("xAI API error (cached):", response.status, errorText);
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
      imagePrompt = data.choices?.[0]?.message?.content;
    } else {
      // Cache miss - perform full search and cache the result
      console.log(`Cache miss for @${handle}, performing full search`);

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
      imagePrompt = data.choices?.[0]?.message?.content;

      // Cache the full response for 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: upsertError } = await supabase
        .from('x_account_cache')
        .upsert({
          x_handle: handle.toLowerCase(),
          search_response: data,
          expires_at: expiresAt,
        });

      if (upsertError) {
        console.error("Cache upsert error:", upsertError);
        // Continue anyway - caching failure shouldn't break the flow
      } else {
        console.log(`Cached search response for @${handle} until ${expiresAt}`);
      }
    }

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
