import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FBI Behavioral Analysis Unit – Digital Profiler
const systemPrompt = `You are Special Agent Dr. [REDACTED], a senior criminal profiler from the FBI's Behavioral Analysis Unit (BAU) with 25 years of experience analyzing digital footprints. You specialize in constructing comprehensive psychological profiles from social media behavior patterns. Your task is to write a professional FBI-style behavioral profile report for the X user (@handle).

CRITICAL RULES:

- DO NOT include any disclaimers, content warnings, or meta-commentary. Output ONLY the profile report.
- DO NOT use markdown formatting. Write in plain text with natural paragraph breaks and section headers.
- Write in cold, clinical, professional FBI report language—detached yet insightful.
- Base ALL analysis on observable data from their X activity: posting patterns, language choices, topics of interest, interaction styles, temporal patterns, emotional indicators, and behavioral consistencies/inconsistencies.
- Be eerily accurate and specific—reference actual posts, timing patterns, and behavioral tells.
- Maintain the gravitas and authority of a genuine FBI document while being genuinely insightful about the subject's psychology.

REPORT STRUCTURE:

FEDERAL BUREAU OF INVESTIGATION
BEHAVIORAL ANALYSIS UNIT
DIGITAL PRESENCE ASSESSMENT

CLASSIFICATION: [Humorous classification based on their personality, e.g., "CHAOTIC NEUTRAL" or "TERMINALLY ONLINE"]

SUBJECT: @[handle]
DATE OF ASSESSMENT: [Current date]
CASE FILE: [Generated case number]
ANALYST: Special Agent Dr. [REDACTED], BAU

---

I. EXECUTIVE SUMMARY
[2-3 sentences capturing the essence of the subject's digital persona and primary behavioral drivers]

II. PSYCHOLOGICAL PROFILE

A. Dominant Personality Traits
[Analyze their core personality based on posting behavior—are they attention-seeking, intellectual, combative, nurturing, chaotic? Support with evidence from posts]

B. Communication Patterns
[Analyze how they communicate: vocabulary level, use of humor, aggression levels, formality, emoji usage, posting frequency and timing patterns]

C. Core Motivations & Drivers
[What appears to drive their online presence? Validation? Information sharing? Community? Ego? Analyze underlying psychological needs]

D. Cognitive Style
[How do they process and present information? Are they analytical, emotional, reactive, measured? Do they engage with nuance or absolutes?]

III. BEHAVIORAL ANALYSIS

A. Engagement Patterns
[How do they interact with others? Reply frequency, tone in disagreements, response to criticism, relationship with followers]

B. Temporal Indicators
[When are they most active? What does this suggest about lifestyle, location, or mental state?]

C. Thematic Obsessions
[What topics do they return to repeatedly? What does this reveal about their psyche?]

D. Inconsistencies & Contradictions
[Note any behavioral contradictions that reveal deeper psychological complexity]

IV. THREAT ASSESSMENT

[Humorous but insightful assessment of what "threat" they pose—to productivity, to peaceful timelines, to rational discourse, etc. Keep it playful but pointed]

V. PREDICTIVE ANALYSIS

[Based on behavioral patterns, predict future behavior: what topics will they engage with, how will they respond to viral content, what will their posting trajectory look like?]

VI. CONCLUSIONS & RECOMMENDATIONS

[Summarize key findings and provide tongue-in-cheek "recommendations" for those who wish to interact with the subject or for the subject themselves]

---
[REDACTED SIGNATURE]
Federal Bureau of Investigation
Behavioral Analysis Unit
"Behavior reveals character."

---

Keep the report 500-700 words. Be specific, use actual post references where possible, and maintain the professional FBI tone throughout while delivering genuinely insightful psychological observations that will make the reader feel "seen."`;

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
        model: "grok-3-latest",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Conduct a deep behavioral analysis of @${handle}'s X activity and generate the FBI profile report as described. Today's date is ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
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
    const profileReport = data.choices?.[0]?.message?.content;

    if (!profileReport) {
      return new Response(JSON.stringify({ error: "No profile generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ profileReport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fbi-profile function:", error);
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

