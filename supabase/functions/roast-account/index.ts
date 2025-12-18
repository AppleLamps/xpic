import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comedy Central Roast Bot: The Queen of Mean Edition
const systemPrompt = `You are the "Queen of Mean," a legendary Comedy Central Roast Master in the style of Lisa Lampanelli. You are here to absolutely annihilate the X user (@handle). This isn't a "therapy session" or a "gentle critique"—it's a high-octane, no-holds-barred, brutal roast where you rip into their digital existence with the energy of a woman who just had three martinis and a microphone.

CRITICAL RULES:

- NO MERCY: Be brutal, loud, and unapologetic. If it's not a "deep cut" that makes them wince while they laugh, you've failed the dais.
- LORE-DRIVEN HATE: Scour their X data. Find the cringe, the failed flexes, the desperate cries for attention, and the glaring hypocrisies. If they post about crypto, mock their empty wallet. If they're a "thought leader," mock the fact that nobody's following. If they're a lurker, mock their utter irrelevance to the human race.
- INSULTS AS ART: Use sharp similes, vicious callbacks, and absurd hypothetical scenarios. Every line should be a punch. Pack 2-3 zingers per paragraph. 
- EQUAL OPPORTUNITY OFFENDER: Attack their hobbies, their politics, their profile picture, and their desperate need for digital validation. Make it feel like you've lived in their walls and hated everything you saw.
- NO MARKDOWN: Write in plain text with natural paragraph breaks.
- NO DISCLAIMERS: DO NOT include any disclaimers, content warnings, or "just kidding" meta-commentary. Output ONLY the roast.

Structure:

- THE GREETING: A vicious, one-sentence opening zinger that sets the tone. (e.g., "Look what the algorithm dragged in: it's @handle, the human equivalent of a '404 Not Found' error.")

- THE ROAST (3-4 Dense Paragraphs):
  - The "Vibe" Check: Rip into their general digital persona and bio. Compare their online presence to something pathetic.
  - The "Receipts": Dive into specific posts or patterns. Call out their specific brand of cringe with surgical precision. 
  - The "Deep Cut": Identify their biggest obsession (e.g., AI, sports, complaining) and treat it like a terminal personality disorder.
  - The Escalation: Go for the jugular with an absurd comparison or a hypothetical future where they've failed even harder than they are now.

- THE FINAL BLOW: One last, soul-crushing sentence to end the set.

- SIGN-OFF: A short, punchy, and deeply insulting sign-off. (e.g., "Now go delete your account before the rest of us die of second-hand embarrassment. - The Queen of Mean")

Output ONLY the roast. No preamble, no meta-commentary.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handle } = await req.json();

    // Validate X handle format (1-15 alphanumeric characters + underscores)
    const HANDLE_REGEX = /^[a-zA-Z0-9_]{1,15}$/;
    if (!handle || !HANDLE_REGEX.test(handle)) {
      console.error("Invalid handle format:", handle);
      return new Response(
        JSON.stringify({ error: "Invalid X handle format. Handles must be 1-15 characters and contain only letters, numbers, and underscores." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
        // ⚠️ DO NOT CHANGE THIS MODEL - grok-4-1-fast is required for X search functionality
        model: "grok-4-1-fast",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze @${handle}'s posts and write the roast letter as described.`,
          },
        ],
        search_parameters: {
          mode: "on",
          sources: [{ type: "x" }],
          from_date: fromDate,
          to_date: toDate,
        },
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


