import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_DAILY_LIMIT = 3;

async function checkAndDeductUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  sessionId: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  if (userId) {
    // Authenticated user — check tier and credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, credits")
      .eq("id", userId)
      .single();

    if (profile?.tier === "pro") return { allowed: true };

    if ((profile?.credits ?? 0) > 0) {
      // Deduct one credit
      await supabase
        .from("profiles")
        .update({ credits: (profile!.credits) - 1 })
        .eq("id", userId);
      return { allowed: true };
    }

    // Check daily free usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    if ((count ?? 0) >= FREE_DAILY_LIMIT) {
      return { allowed: false, reason: `Free limit reached (${FREE_DAILY_LIMIT}/day). Buy credits to continue.` };
    }

    await supabase.from("usage_logs").insert({ user_id: userId });
    return { allowed: true };
  }

  // Anonymous — check by session
  if (sessionId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .gte("created_at", today.toISOString());

    if ((count ?? 0) >= FREE_DAILY_LIMIT) {
      return { allowed: false, reason: `Free limit reached (${FREE_DAILY_LIMIT}/day). Sign in and buy credits to continue.` };
    }

    await supabase.from("usage_logs").insert({ session_id: sessionId });
    return { allowed: true };
  }

  return { allowed: true };
}

type ContentType =
  | "caption"
  | "product"
  | "ad"
  | "hashtag"
  | "image_caption"
  | "whatsapp_template"
  | "bio"
  | "reply";

interface Payload {
  type: ContentType;
  businessName: string;
  description: string;
  platform: string;
  tone: string;
  price?: string;
  language?: string;
  festival?: string;
  variant?: number;
  emojis?: boolean;
  refine?: "shorter" | "festive" | null;
  refineText?: string;
  mode?: "personal" | "business";
  // image caption
  imageBase64?: string;
  imageMimeType?: string;
  // whatsapp
  templateType?: "greeting" | "order" | "offer";
  // bio
  bioType?: "instagram" | "linkedin";
  // reply
  messageType?: "complaint" | "inquiry" | "compliment" | "order" | "general";
}

function langDetail(language: string): string {
  const map: Record<string, string> = {
    Hinglish: " (mix of Hindi written in Roman/English script and English, like real Indian social media)",
    Hindi: " (Devanagari script, natural conversational Hindi)",
    Tamil: " (Tamil script, natural conversational Tamil)",
    Telugu: " (Telugu script, natural conversational Telugu)",
    Marathi: " (Devanagari script, natural conversational Marathi)",
    Bengali: " (Bengali script, natural conversational Bengali)",
  };
  return language && language !== "English"
    ? `\nLanguage: Write in ${language}${map[language] ?? ""}.`
    : "";
}

function festContext(festival: string): string {
  return festival
    ? `\nFestival context: Weave in a natural, tasteful reference to ${festival} (greetings, themes, or offer angle).`
    : "";
}

function freshVariant(variant?: number): string {
  return variant && variant > 0
    ? `\nIMPORTANT: Produce a FRESH variation different from previous attempts. Use new hooks, angles and wording.`
    : "";
}

function emojiRule(emojis?: boolean): string {
  return emojis === false
    ? `\nDo NOT use any emojis. Plain text only.`
    : `\nUse tasteful emojis sparingly to add warmth.`;
}

function buildPrompt(p: Payload): string {
  const lang = langDetail(p.language ?? "English");
  const fest = festContext(p.festival ?? "");
  const fresh = freshVariant(p.variant);
  const emoji = emojiRule(p.emojis);

  // ── Refine mode ──────────────────────────────────────────────────────────
  if (p.refine && p.refineText) {
    const instr =
      p.refine === "shorter"
        ? "Rewrite the following copy to be roughly 40% shorter while keeping the core message and CTA. Punchier and tighter."
        : "Rewrite the following copy to feel more festive and celebratory — warmer tone, festive vibes, joyful energy. Keep the same length and CTA.";
    return `${instr}${lang}${emoji}

Original copy:
"""
${p.refineText}
"""

Output ONLY the rewritten copy. No preamble, no explanations, no quote marks around the output.`;
  }

  // ── Hashtags ─────────────────────────────────────────────────────────────
  if (p.type === "hashtag") {
    if (p.mode === "personal") {
      return `Generate 20 Instagram hashtags for a personal post.
About: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}

Rules:
- Mix of: 5 popular lifestyle tags, 10 niche/topic-specific tags, 5 India/location-relevant tags.
- Personal hashtags — NOT business or promotional.
- All lowercase, no spaces, no punctuation other than the # symbol.
- One hashtag per line, no numbering, no commentary.
- Output ONLY the 20 hashtags.`;
    }
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

  // ── Caption ───────────────────────────────────────────────────────────────
  if (p.type === "caption") {
    if (p.mode === "personal") {
      return `Write 3 personal ${p.platform} captions for someone's post.
About: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}${emoji}

Rules:
- Write like a real person, NOT a brand or business.
- Relatable, authentic, fun or emotional — whatever fits the tone.
- No promotional language, no CTAs like "buy now" or "DM to order".
- Each caption under 100 words.
- End each with 5 relevant personal hashtags.
- Output ONLY the 3 captions, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;
    }
    return `Generate 3 ${p.platform} captions for an Indian small business.
Business: ${p.businessName}
Product/Offer: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}${emoji}

Rules:
- Each caption under 150 words.
- End each with 5 relevant hashtags.
- Resonate with Indian customers (use cultural cues if relevant).
- Output ONLY the 3 captions, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;
  }

  // ── Product description ───────────────────────────────────────────────────
  if (p.type === "product") {
    return `Write a WhatsApp-ready product description for an Indian business.
Business: ${p.businessName}
Product: ${p.description}
${p.price ? `Price: ${p.price}` : ""}
Tone: ${p.tone}${lang}${fest}${fresh}${emoji}

Rules:
- Under 100 words.
- Simple, conversational language.
- Include a clear CTA like "Order now on WhatsApp".
- No markdown, no bullet symbols. Plain text only.
- Output ONLY the description.`;
  }

  // ── Ad copy ───────────────────────────────────────────────────────────────
  if (p.type === "ad") {
    return `Write a short ${p.platform} ad copy for an Indian small business.
Business: ${p.businessName}
Product/Offer: ${p.description}
Tone: ${p.tone}${lang}${fest}${fresh}${emoji}

Structure (label each line exactly):
Hook: <one punchy line>
Body: <2-3 short sentences highlighting value>
CTA: <one strong call to action>

Rules: Keep total under 80 words. Output ONLY those three labeled lines.`;
  }

  // ── Image caption (vision) ────────────────────────────────────────────────
  if (p.type === "image_caption") {
    const hasContext = p.description && p.description.trim() && p.description !== "product photo";
    const contextLine = hasContext ? `\nExtra context from user: ${p.description}` : "";
    const businessLine = p.businessName && p.businessName !== "my business" ? `\nPost for: ${p.businessName}` : "";
    return `Look carefully at this photo and write 3 engaging Instagram captions that match what you actually see.${businessLine}${contextLine}
Tone: ${p.tone}${lang}${emoji}

Rules:
- Look at the photo first — it could be anything: a person, landscape, food, travel, product, pet, moment, etc.
- Write captions that feel natural and authentic to what is actually in the image.
- Do NOT assume it is a product or business photo unless the context says so.
- If it looks like a personal photo (selfie, travel, nature, food, lifestyle), write personal/lifestyle captions.
- If it looks like a product or business photo, write promotional captions.
- Each caption under 150 words.
- End each with 5 relevant hashtags that match the photo's actual content.
- Output ONLY the 3 captions, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;
  }

  // ── WhatsApp broadcast templates ──────────────────────────────────────────
  if (p.type === "whatsapp_template") {
    const tType = p.templateType ?? "greeting";
    if (tType === "greeting") {
      return `Write 3 warm WhatsApp broadcast greeting messages for ${p.festival || "a festival"}.
Business: ${p.businessName}
Tone: Festive and warm${lang}${emoji}

Rules:
- Each message under 80 words.
- Personal, warm, feels like it's from a real business owner.
- Include a soft CTA (e.g. "Shop our festive collection", "Visit us this season").
- No markdown. Plain text only.
- Output ONLY the 3 messages, clearly numbered "1.", "2.", "3." with a blank line between each.`;
    }
    if (tType === "order") {
      return `Write 3 WhatsApp order confirmation messages for an Indian business.
Business: ${p.businessName}
Order details: ${p.description}
Tone: Professional and reassuring${lang}${emoji}

Rules:
- Each message under 80 words.
- Include order details naturally.
- Reassure the customer, give next steps.
- End with a thank you and invite them to reach out for queries.
- No markdown. Plain text only.
- Output ONLY the 3 messages, clearly numbered "1.", "2.", "3." with a blank line between each.`;
    }
    // offer
    return `Write 3 WhatsApp festive offer broadcast messages for an Indian business.
Business: ${p.businessName}
Offer: ${p.description}
Festival: ${p.festival || "festive season"}
Tone: Exciting and urgent${lang}${emoji}

Rules:
- Each message under 80 words.
- Highlight the offer clearly with urgency.
- Include a CTA (e.g. "Reply YES to order", "Click the link below").
- No markdown. Plain text only.
- Output ONLY the 3 messages, clearly numbered "1.", "2.", "3." with a blank line between each.`;
  }

  // ── Bio generator ─────────────────────────────────────────────────────────
  if (p.type === "bio") {
    const platform = p.bioType === "linkedin" ? "LinkedIn" : "Instagram";
    const charLimit = p.bioType === "linkedin" ? "300 characters" : "150 characters";
    return `Write 3 ${platform} bios for an Indian small business.
Business: ${p.businessName}
What they do: ${p.description}
Tone: ${p.tone}${lang}

Rules:
- Each bio under ${charLimit}.
- ${p.bioType === "instagram" ? "Use line breaks, emojis, and a CTA like 'DM to order' or link in bio." : "Professional tone, highlight expertise and value. No emojis."}
- Resonate with Indian audience.
- Output ONLY the 3 bios, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;
  }

  // ── Reply generator ───────────────────────────────────────────────────────
  if (p.type === "reply") {
    const mType = p.messageType ?? "general";
    const toneMap: Record<string, string> = {
      complaint: "empathetic, apologetic, solution-focused",
      inquiry: "helpful, informative, friendly",
      compliment: "warm, grateful, genuine",
      order: "professional, reassuring, clear",
      general: "friendly, professional",
    };
    return `Write 3 polite customer reply options for an Indian small business.
Business: ${p.businessName}
Customer message type: ${mType}
Customer message:
"""
${p.description}
"""
Tone: ${toneMap[mType]}${lang}

Rules:
- Each reply under 60 words.
- Sound human, warm, and professional — not robotic.
- Address the customer's concern directly.
- ${mType === "complaint" ? "Acknowledge the issue, apologize sincerely, offer a solution or next step." : ""}
- ${mType === "compliment" ? "Thank them genuinely and invite them back." : ""}
- No markdown. Plain text only.
- Output ONLY the 3 replies, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;
  }

  return `Write content for: ${p.description}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload & { userId?: string; sessionId?: string };
    const isRefine = !!(payload?.refine && payload?.refineText);
    const isImageCaption = payload?.type === "image_caption";

    if (
      !payload?.type ||
      (!isRefine && !isImageCaption && (!payload?.businessName || !payload?.description))
    ) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Usage / credit check
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const usageCheck = await checkAndDeductUsage(supabase, payload.userId ?? null, payload.sessionId ?? null);
    if (!usageCheck.allowed) {
      return new Response(JSON.stringify({ error: usageCheck.reason ?? "Usage limit reached" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = buildPrompt(payload);

    // Build messages — for image_caption, include the image as a vision message
    type MessageContent =
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;

    const userContent: MessageContent =
      isImageCaption && payload.imageBase64
        ? [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${payload.imageMimeType ?? "image/jpeg"};base64,${payload.imageBase64}`,
              },
            },
          ]
        : prompt;

    // For image captions, try vision model first, fall back to text-only if it fails
    let resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content:
              "You are a creative caption writer. Write clear, engaging, authentic captions. Follow output formatting rules exactly. Never include preamble or explanations.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    // If vision request failed and this is an image caption, retry as text-only with description
    if (!resp.ok && isImageCaption) {
      const errText = await resp.text();
      console.error("Vision request failed:", resp.status, errText, "— retrying as text-only");
      const textOnlyPrompt = `Write 3 engaging Instagram captions for a photo.
${payload.description ? `Context: ${payload.description}` : ""}
Tone: ${payload.tone ?? "Casual"}

Rules:
- Write captions that feel personal, authentic and engaging.
- Each caption under 150 words.
- End each with 5 relevant hashtags.
- Output ONLY the 3 captions, clearly numbered "1.", "2.", "3." with a blank line between each.
- No preamble, no explanations.`;

      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: "You are a creative caption writer. Follow output formatting rules exactly." },
            { role: "user", content: textOnlyPrompt },
          ],
        }),
      });
    }

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
      return new Response(JSON.stringify({ error: `AI error (${resp.status}): ${t.slice(0, 200)}` }), {
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
