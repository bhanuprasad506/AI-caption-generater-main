import { useCallback, useState } from "react";
import { callGemini, callGeminiVision, buildPrompt, type GeneratePayload } from "@/lib/gemini";

function parseOutputs(text: string): string[] {
  const parts = text
    .trim()
    .split(/\n\s*(?=\d{1,2}[\.\)]\s)/)
    .map((p) => p.replace(/^\d{1,2}[\.\)]\s*/, "").trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [text.trim()];
}

const SYSTEM = "You are an expert copywriter for Indian creators and businesses. Write clear, engaging, culturally aware copy. Follow output formatting rules exactly. Never include preamble or explanations.";

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (payload: GeneratePayload): Promise<string[]> => {
    setLoading(true);
    setError(null);
    try {
      const prompt = buildPrompt(payload);
      let text: string;

      // Image captions with photo → use Gemini Vision
      if (payload.type === "image_caption" && payload.imageBase64) {
        text = await callGeminiVision(
          [
            { text: prompt },
            { inline_data: { mime_type: payload.imageMimeType ?? "image/jpeg", data: payload.imageBase64 } },
          ],
          SYSTEM
        );
      } else {
        // Everything else → use Groq
        text = await callGemini([{ text: prompt }], SYSTEM);
      }

      // Hashtags: return as single joined string
      if (payload.type === "hashtag") {
        const tags = text.trim().split(/\n+/).map((l) => l.replace(/^[-*\d\.\)\s]+/, "").trim()).filter((l) => l.startsWith("#"));
        return [tags.length > 0 ? tags.join(" ") : text.trim()];
      }

      return parseOutputs(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}
