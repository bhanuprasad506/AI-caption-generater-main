// Brand voice memory — persisted to localStorage

export interface BrandVoice {
  businessName: string;
  tone: string;
  usp: string;        // Unique selling propositions / tagline
  language: string;
  platform: string;
}

const BRAND_KEY = "writeright.brandvoice.v1";

export function loadBrandVoice(): BrandVoice | null {
  try {
    const raw = localStorage.getItem(BRAND_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrandVoice;
  } catch {
    return null;
  }
}

export function saveBrandVoice(voice: BrandVoice): void {
  try {
    localStorage.setItem(BRAND_KEY, JSON.stringify(voice));
  } catch {
    // ignore
  }
}

export function clearBrandVoice(): void {
  try {
    localStorage.removeItem(BRAND_KEY);
  } catch {
    // ignore
  }
}
