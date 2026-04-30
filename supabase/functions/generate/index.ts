import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ContentType = "caption" | "product" | "ad" | "hashtag";

interface Payload {
  type: ContentType;
  businessName: string;
  description: string;
  platform: string;
  tone: string;
  price?: string;
  language?: string;       // English | Hinglish | Hindi | Tamil | Telugu | Marathi | Bengali
  festival?: string;       // e.g. "Diwali", "Holi", "" for none
  variant?: number;        // bump to force a fresh regeneration
  emojis?: boolean;        // default true
  refine?: "shorter" | "festive" | null;
  refineText?: string;     // existing text to refine
}

function buildPrompt(p: Payload): string {
  const langDetail: Record<string, string> = {
    Hinglish: " (mix of Hindi written in Roman/English script and English, like real Indian social media)",
    Hindi: " (Devanagari script, natural conversational Hindi)",
    Tamil: " (Tamil script, natural conversational Tamil)",
    Telugu: " (Telugu script, natural conversational Telugu)",
    Marathi: " (Devanagari script, natural conversational Marathi)",
    Bengali: " (Bengali script, natural conversational Bengali)",
  };
  const lang = p.language && p.language !== "English"
    ? `\nLanguage: Write in ${p.language}${langDetail[p.language] ?? ""}.`
    : "";
  const fest = p.festival
    ? `\nFestival context: Weave in a natural, tasteful reference to ${p.festival} (greetings, themes, or offer angle).`
    : "";
  const fresh = p.variant && p.variant > 0
    ? `\nIMPORTANT: Produce a FRESH variation different from previous attempts. Use new hooks, angles and wording.`
    : "";
  const emojiRule = p.emojis === false
    ? `\nDo NOT use any emojis. Plain text only.`
    : `\nUse tasteful emojis sparingly to add warmth.`;

  // Refine mode: rewrite an existing piece of copy
  if (p.refine && p.refineText) {
    const instr = p.refine === "shorter"
      ? "Rewrite the following copy to be roughly 40% shorter while keeping the core message and CTA. Punchier and tighter."
      : "Rewrite the following copy to feel more festive and celebratory — warmer tone, festive vibes, joyful energy. Keep the same length and CTA.";
    return `${instr}${lang}${emojiRule}

Original copy:
"""
${p.refineText}
"""

Output ONLY the rewritten copy. No preamble, no explanations, no quote marks around the output.`;
  }

  if (p.type === "hashtag") {
    return `Generate 20 high-performing ${p.platform} hashtags for an Indian small business.
Business: ${p.businessName}
Niche / Product: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}

Rules:
- Mix of: 5 broad/popular tags, 10 niche-specific tags, 5 location/India-relevant tags.
- All lowercase, no spaces, no punctuation other than the # symbol.
- One hashtag per line, no numbering, no commentary.
- Output ONLY the 20 hashtags.`;
  }

  if (p.type === "caption") {
    return `Generate 3 ${p.platform} captions for an Indian small business.
Business: ${p.businessName}
Product/Offer: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}${emojiRule}

Rules:
- Each caption under 150 words.
- End each with 5 relevant hashtags.
- Resonate with Indian customers (use cultural cues if relevant).
- Output ONLY the 3 captions, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;
  }
  if (p.type === "product") {
    return `Write a WhatsApp-ready product description for an Indian business.
Business: ${p.businessName}
Product: ${p.description}
${p.price ? `Price: ${p.price}` : ""}
Tone: ${p.tone}${lang}${fest}${fresh}${emojiRule}

Rules:
- Under 100 words.
- Simple, conversational language.
- Include a clear CTA like "Order now on WhatsApp".
- No markdown, no bullet symbols. Plain text only.
- Output ONLY the description.`;
  }
  return `Write a short ${p.platform} ad copy for an Indian small business.
Business: ${p.businessName}
Product/Offer: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}${emojiRule}

Structure (label each line exactly):
Hook: <one punchy line>
Body: <2-3 short sentences highlighting value>
CTA: <one strong call to action>

Rules: Keep total under 80 words. Output ONLY those three labeled lines.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    const isRefine = !!(payload?.refine && payload?.refineText);
    if (!payload?.type || (!isRefine && (!payload?.businessName || !payload?.description))) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = buildPrompt(payload);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert copywriter for Indian small businesses. Write clear, engaging, culturally aware copy. Follow output formatting rules exactly. Never include preamble or explanations.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
