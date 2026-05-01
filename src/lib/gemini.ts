// Central AI client — uses Groq (fast, free, no credit card)
// Falls back to Gemini if VITE_GEMINI_API_KEY is set

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

export function getGroqKey(): string {
  return import.meta.env.VITE_GROQ_API_KEY ?? "";
}

export function getGeminiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY ?? "";
}

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

// For image captions — uses Gemini Vision (requires Gemini key)
export async function callGeminiVision(
  parts: GeminiPart[],
  systemInstruction?: string
): Promise<string> {
  const key = getGeminiKey();
  if (!key || key === "paste_your_gemini_key_here") {
    throw new Error("Gemini API key needed for image captions. Add VITE_GEMINI_API_KEY to .env");
  }
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 1500 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  const resp = await fetch(GEMINI_URL(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg: string = err?.error?.message ?? `Gemini error ${resp.status}`;
    if (resp.status === 429) throw new Error("Gemini quota exceeded. Try again later.");
    throw new Error(msg.slice(0, 120));
  }
  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// Main text generation — uses Groq
export async function callGemini(
  parts: GeminiPart[],
  systemInstruction?: string
): Promise<string> {
  const groqKey = getGroqKey();

  // Use Groq if key is available
  if (groqKey && groqKey !== "paste_your_groq_key_here") {
    const textContent = parts.filter((p): p is { text: string } => "text" in p).map((p) => p.text).join("\n");
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: textContent },
        ],
        temperature: 0.9,
        max_tokens: 1500,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg: string = err?.error?.message ?? `Groq error ${resp.status}`;
      if (resp.status === 429) throw new Error("Too many requests — please wait a moment and try again.");
      throw new Error(msg.slice(0, 120));
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("No content returned. Please try again.");
    return text;
  }

  // Fallback to Gemini text-only
  const geminiKey = getGeminiKey();
  if (!geminiKey || geminiKey === "paste_your_gemini_key_here") {
    throw new Error("No API key configured. Add VITE_GROQ_API_KEY to your .env file.");
  }
  return callGeminiVision(parts, systemInstruction);
}

// ── Prompt builders ────────────────────────────────────────────────────────

const SYSTEM = "You are an expert copywriter for Indian creators and businesses. Write clear, engaging, culturally aware copy. Follow output formatting rules exactly. Never include preamble or explanations.";

function langNote(language: string): string {
  const map: Record<string, string> = {
    Hinglish: " Write in Hinglish (mix of Hindi in Roman script and English, like real Indian social media).",
    Hindi: " Write in Hindi (Devanagari script, natural conversational Hindi).",
    Tamil: " Write in Tamil script.",
    Telugu: " Write in Telugu script.",
    Marathi: " Write in Marathi (Devanagari script).",
    Bengali: " Write in Bengali script.",
  };
  return language && language !== "English" ? (map[language] ?? "") : "";
}

function festNote(festival: string): string {
  return festival ? `\nFestival context: Weave in a natural, tasteful reference to ${festival}.` : "";
}

function emojiNote(emojis?: boolean): string {
  return emojis === false ? "\nDo NOT use any emojis. Plain text only." : "\nUse tasteful emojis sparingly.";
}

export interface GeneratePayload {
  type: "caption" | "product" | "ad" | "hashtag" | "image_caption" | "whatsapp_template" | "bio" | "reply";
  mode?: "personal" | "business";
  businessName?: string;
  description: string;
  platform?: string;
  tone?: string;
  price?: string;
  language?: string;
  festival?: string;
  variant?: number;
  emojis?: boolean;
  refine?: "shorter" | "festive";
  refineText?: string;
  imageBase64?: string;
  imageMimeType?: string;
  templateType?: "greeting" | "order" | "offer";
  bioType?: "instagram" | "linkedin";
  messageType?: string;
}

export function buildPrompt(p: GeneratePayload): string {
  const lang = langNote(p.language ?? "English");
  const fest = festNote(p.festival ?? "");
  const emoji = emojiNote(p.emojis);
  const fresh = p.variant && p.variant > 0 ? "\nIMPORTANT: Produce a FRESH variation, different hooks and wording from previous attempts." : "";
  const isPersonal = p.mode === "personal";
  const name = p.businessName || (isPersonal ? "my account" : "my business");

  // ── Refine ──────────────────────────────────────────────────────────────
  if (p.refine && p.refineText) {
    const instr = p.refine === "shorter"
      ? "Rewrite the following copy to be roughly 40% shorter while keeping the core message and CTA. Punchier and tighter."
      : "Rewrite the following copy to feel more festive and celebratory — warmer tone, festive vibes, joyful energy.";
    return `${instr}${lang}${emoji}\n\nOriginal copy:\n"""\n${p.refineText}\n"""\n\nOutput ONLY the rewritten copy. No preamble, no quote marks.`;
  }

  // ── Caption ──────────────────────────────────────────────────────────────
  if (p.type === "caption") {
    if (isPersonal) {
      return `Write 3 personal Instagram captions for someone's post.
About this post: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}${fest}${fresh}${emoji}

Rules:
- Write like a real person posting on Instagram — NOT a brand or business.
- Relatable, authentic, fun or emotional depending on the tone.
- No promotional language, no "DM to order", no business CTAs.
- Each caption under 100 words.
- End each with 5 relevant personal hashtags.
- Output ONLY the 3 captions, numbered "1.", "2.", "3." with a blank line between each.`;
    }
    return `Generate 3 ${p.platform ?? "Instagram"} captions for an Indian small business.
Business: ${name}
Product/Offer: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}${fest}${fresh}${emoji}

Rules:
- Each caption under 150 words.
- End each with 5 relevant hashtags.
- Resonate with Indian customers.
- Output ONLY the 3 captions, numbered "1.", "2.", "3." with a blank line between each.`;
  }

  // ── Hashtags ─────────────────────────────────────────────────────────────
  if (p.type === "hashtag") {
    if (isPersonal) {
      return `Generate 20 Instagram hashtags for a personal post.
About: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}${fest}${fresh}

Rules:
- Personal hashtags — NOT business or promotional.
- Mix: 5 popular lifestyle tags, 10 niche/topic tags, 5 India/location tags.
- All lowercase, no spaces, only # symbol.
- One per line, no numbering.
- Output ONLY the 20 hashtags.`;
    }
    return `Generate 20 high-performing ${p.platform ?? "Instagram"} hashtags for an Indian small business.
Business: ${name}
Niche/Product: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}${fest}${fresh}

Rules:
- Mix: 5 broad/popular, 10 niche-specific, 5 India/location tags.
- All lowercase, no spaces, only # symbol.
- One per line, no numbering.
- Output ONLY the 20 hashtags.`;
  }

  // ── Product ───────────────────────────────────────────────────────────────
  if (p.type === "product") {
    return `Write a WhatsApp-ready product description for an Indian business.
Business: ${name}
Product: ${p.description}
${p.price ? `Price: ${p.price}` : ""}
Tone: ${p.tone ?? "Casual"}${lang}${fest}${fresh}${emoji}

Rules:
- Under 100 words. Simple, conversational.
- Include a clear CTA like "Order now on WhatsApp".
- No markdown, no bullet symbols. Plain text only.
- Output ONLY the description.`;
  }

  // ── Ad copy ───────────────────────────────────────────────────────────────
  if (p.type === "ad") {
    return `Write a short ${p.platform ?? "Instagram"} ad copy for an Indian small business.
Business: ${name}
Product/Offer: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}${fest}${fresh}${emoji}

Structure (label each line exactly):
Hook: <one punchy line>
Body: <2-3 short sentences highlighting value>
CTA: <one strong call to action>

Rules: Keep total under 80 words. Output ONLY those three labeled lines.`;
  }

  // ── Image caption ─────────────────────────────────────────────────────────
  if (p.type === "image_caption") {
    if (isPersonal) {
      return `Look at this photo and write 3 Instagram captions for a personal post.
${p.description ? `Context: ${p.description}` : ""}
Tone: ${p.tone ?? "Casual"}${lang}${emoji}

Rules:
- Write like a real person — NOT a brand.
- Could be selfie, travel, food, nature, pet, hangout — match what you see.
- Relatable, fun, emotional or aesthetic.
- Each caption under 100 words.
- End each with 5 relevant personal hashtags.
- Output ONLY the 3 captions, numbered "1.", "2.", "3." with a blank line between each.`;
    }
    return `Look at this product/business photo and write 3 promotional Instagram captions.
Business: ${name}
${p.description ? `Context: ${p.description}` : ""}
Tone: ${p.tone ?? "Casual"}${lang}${emoji}

Rules:
- Engaging promotional captions highlighting the product or service.
- Include a call to action.
- Each caption under 150 words.
- End each with 5 relevant business hashtags.
- Output ONLY the 3 captions, numbered "1.", "2.", "3." with a blank line between each.`;
  }

  // ── WhatsApp templates ────────────────────────────────────────────────────
  if (p.type === "whatsapp_template") {
    const tType = p.templateType ?? "greeting";
    if (tType === "greeting") {
      return `Write 3 warm WhatsApp broadcast greeting messages for ${p.festival || "a festival"}.
Business: ${name}
Tone: Festive and warm${lang}${emoji}

Rules:
- Each message under 80 words. Personal, warm, from a real business owner.
- Include a soft CTA (e.g. "Shop our festive collection").
- No markdown. Plain text only.
- Output ONLY the 3 messages, numbered "1.", "2.", "3." with a blank line between each.`;
    }
    if (tType === "order") {
      return `Write 3 WhatsApp order confirmation messages for an Indian business.
Business: ${name}
Order details: ${p.description}
Tone: Professional and reassuring${lang}${emoji}

Rules:
- Each message under 80 words. Include order details naturally.
- Reassure the customer, give next steps. End with thank you.
- No markdown. Plain text only.
- Output ONLY the 3 messages, numbered "1.", "2.", "3." with a blank line between each.`;
    }
    return `Write 3 WhatsApp festive offer broadcast messages for an Indian business.
Business: ${name}
Offer: ${p.description}
Festival: ${p.festival || "festive season"}
Tone: Exciting and urgent${lang}${emoji}

Rules:
- Each message under 80 words. Highlight the offer with urgency.
- Include a CTA (e.g. "Reply YES to order").
- No markdown. Plain text only.
- Output ONLY the 3 messages, numbered "1.", "2.", "3." with a blank line between each.`;
  }

  // ── Bio ───────────────────────────────────────────────────────────────────
  if (p.type === "bio") {
    const platform = p.bioType === "linkedin" ? "LinkedIn" : "Instagram";
    const charLimit = p.bioType === "linkedin" ? "300 characters" : "150 characters";
    if (isPersonal) {
      return `Write 3 ${platform} bios for a personal account.
Name: ${name}
About them: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}

Rules:
- Each bio under ${charLimit}.
- ${p.bioType === "instagram" ? "Use line breaks, emojis, feel personal and authentic. Optional CTA like 'link in bio'." : "Professional but personal. Highlight who you are. No emojis."}
- Sound like a real person, NOT a brand.
- Output ONLY the 3 bios, numbered "1.", "2.", "3." with a blank line between each.`;
    }
    return `Write 3 ${platform} bios for an Indian small business.
Business: ${name}
What they do: ${p.description}
Tone: ${p.tone ?? "Casual"}${lang}

Rules:
- Each bio under ${charLimit}.
- ${p.bioType === "instagram" ? "Use line breaks, emojis, and a CTA like 'DM to order' or link in bio." : "Professional tone, highlight expertise and value. No emojis."}
- Resonate with Indian audience.
- Output ONLY the 3 bios, numbered "1.", "2.", "3." with a blank line between each.`;
  }

  // ── Reply ─────────────────────────────────────────────────────────────────
  if (p.type === "reply") {
    const mType = p.messageType ?? "general";
    if (isPersonal) {
      const toneMap: Record<string, string> = {
        rude_comment: "calm, unbothered, confident — optionally witty",
        compliment: "warm, genuine, grateful — short and sweet",
        question: "friendly, helpful, conversational",
        collab: "polite, can ask for details or decline gracefully",
        general: "friendly, casual, like texting a friend",
      };
      return `Write 3 different reply options for a personal Instagram account.
Message type: ${mType}
Message received:
"""
${p.description}
"""
Tone: ${toneMap[mType] ?? "friendly, casual"}${lang}

Rules:
- Write exactly like a real Indian person on their personal account.
- NOT a business. NOT formal. NOT robotic.
- Each reply feels different — one short, one medium, one with personality.
- ${mType === "rude_comment" ? "Stay calm and unbothered. A little wit is fine. Don't be aggressive." : ""}
- ${mType === "compliment" ? "Be genuinely warm. Keep it real, not over the top." : ""}
- ${mType === "collab" ? "Can ask for more details or decline gracefully." : ""}
- Use emojis naturally where they fit.
- Each reply under 40 words.
- No markdown. Plain text only.
- Output ONLY the 3 replies, numbered "1.", "2.", "3." with a blank line between each.`;
    }
    const toneMap: Record<string, string> = {
      complaint: "empathetic, apologetic, solution-focused",
      inquiry: "helpful, informative, friendly",
      compliment: "warm, grateful, genuine",
      order: "professional, reassuring, clear",
      general: "friendly, professional",
    };
    return `Write 3 polite customer reply options for an Indian small business.
Business: ${name}
Message type: ${mType}
Customer message:
"""
${p.description}
"""
Tone: ${toneMap[mType] ?? "friendly, professional"}${lang}

Rules:
- Each reply under 60 words. Human, warm, professional — not robotic.
- Address the concern directly.
- ${mType === "complaint" ? "Acknowledge the issue, apologize sincerely, offer a solution." : ""}
- ${mType === "compliment" ? "Thank them genuinely and invite them back." : ""}
- No markdown. Plain text only.
- Output ONLY the 3 replies, numbered "1.", "2.", "3." with a blank line between each.`;
  }

  return `Write content for: ${p.description}`;
}
