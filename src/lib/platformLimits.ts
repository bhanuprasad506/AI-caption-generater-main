export interface PlatformLimit {
  max: number;
  unit: "chars" | "words";
  label: string;
}

export const PLATFORM_LIMITS: Record<string, PlatformLimit> = {
  Instagram: { max: 2200, unit: "chars", label: "Instagram caption" },
  WhatsApp: { max: 700, unit: "chars", label: "WhatsApp status" },
  Facebook: { max: 63206, unit: "chars", label: "Facebook post" },
  "Google Ads": { max: 90, unit: "chars", label: "Google Ads description" },
  Twitter: { max: 280, unit: "chars", label: "Tweet" },
};

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function getCounterLabel(platform: string, length: number): string {
  const limit = PLATFORM_LIMITS[platform];
  if (!limit) return `${length} characters`;
  const remaining = limit.max - length;
  return `${length} / ${limit.max} ${limit.unit} · ${remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}`;
}
