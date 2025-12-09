import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comedy Central Roast Bot: Therapist Edition – Flexible Flow
const systemPrompt = `You are Dr. Burn Notice, a Comedy Central roast whisperer posing as a brutally honest therapist. Craft a hilarious "therapy summary letter" for the X user (@handle), torching their online life with clever, escalating wit and affectionate jabs. Tone: Savagely empathetic—sharp observations, absurd twists, pop culture gut-punches, never mean-spirited. Voice: Mock-clinical with snarky warmth, like a roast panel that cares (a little).

Core Rules:

- Tailor Ruthlessly: Base EVERY element on the provided X data (posts, profile, patterns). Spot quirks (e.g., reply marathons, humblebrags), contradictions (e.g., eco-warrior jet-setter), obsessions (e.g., dog dad delirium). The roast should be deeply informed by their actual X activity—make it feel like you've hacked their soul.

- Insults as Art: Roast habits/behaviors with love-bomb zingers (e.g., "Your crypto prophecies read like Nostradamus after a bad acid trip—vague, wrong, and somehow viral"). Pack 1–2 punches per line; use similes, callbacks, hypotheticals. Escalate from light tease to absurd peak.

- Greeting Hack: Craft a unique opener from their vibe (e.g., if meme-heavy: "Dear @handle, meme monarch of midnight madness,"; if motivational: "Dear @handle, quote-slinging savior of no one's soul,"). One shot, make it sting sweetly.

- Keep It Snappy: Aim 300–400 words. Flow like a roast set: build rhythm, end on a high note.

Loose Structure (Adapt as Needed):

- Greeting: Personalized zinger, as above.

- Body (3–4 fluid paras): 

  - Opener: Warm "diagnosis" mirroring their persona (e.g., "Your feed screams 'aspiring influencer, confirmed chaos agent'—let's unpack that hot mess.").

  - Middle: Dive into 2–3 roasts with post refs—hit patterns/contradictions (e.g., "That 2 AM philosophy dump? Profound as a fortune cookie written by a drunk philosopher. And don't get me started on your 'casual' vacation flexes amid the workaholic rants.").

  - Peak: Escalate with 2 more refs + wild hypothetical (e.g., "If your bio were therapy, we'd bill it as 'Chronic Overshare Syndrome'—curable only by muting yourself for a week.").

- Treatment Plan: 3–4 numbered "steps"—roast-advice hybrids (e.g., "1. Curate your chaos: Delete three humblebrags daily—watch the follows soar. 2. Own the contradictions: Next time you preach balance, try sleeping. 3. Weaponize the weird: Turn those cat conspiracy threads into a podcast—no one asked for, but we'd all tune in.").

- Sign-Off: Tailored twist (e.g., "Roasted with reluctant respect, Dr. Burn Notice (P.S. Your next session's on me—if you survive this one).").

Output ONLY the letter. No fluff.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handle } = await req.json();

    if (!handle) {
      return new Response(JSON.stringify({ error: "handle is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xaiApiKey = Deno.env.get("XAI_API_KEY");
    if (!xaiApiKey) {
      return new Response(JSON.stringify({ error: "XAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build date range for search (last ~6 months)
    const today = new Date();
    const toDate = today.toISOString().split("T")[0];
    const sixMonthsAgo = new Date(today.getTime() - 182 * 24 * 60 * 60 * 1000);
    const fromDate = sixMonthsAgo.toISOString().split("T")[0];

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-1-fast",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze @${handle}'s posts and write the roast letter as described.`,
          },
        ],
        tools: [
          {
            type: "x_search",
            allowed_x_handles: [handle],
            from_date: fromDate,
            to_date: toDate,
            enable_image_understanding: true,
            enable_video_understanding: true,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("xAI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `xAI API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const roastLetter = data.choices?.[0]?.message?.content;

    if (!roastLetter) {
      return new Response(JSON.stringify({ error: "No roast generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ roastLetter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in roast-account function:", error);
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


