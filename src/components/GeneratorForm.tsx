import { useEffect, useState } from "react";
import { Sparkles, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_LIMITS, getCounterLabel } from "@/lib/platformLimits";
import { detectCurrentFestival, ALL_FESTIVALS } from "@/lib/festivalDetector";
import type { BrandVoice } from "@/lib/brandVoice";

export type ContentType = "caption" | "product" | "ad" | "hashtag";
export type AppMode = "personal" | "business";

export interface GenerateInput {
  type: ContentType;
  businessName: string;
  description: string;
  platform: string;
  tone: string;
  price?: string;
  language: string;
  festival: string;
  variant?: number;
  emojis: boolean;
  mode: AppMode;
}

interface Props {
  onGenerate: (input: GenerateInput) => void;
  loading: boolean;
  brandVoice?: BrandVoice | null;
  mode: AppMode;
}

const BUSINESS_TONES = ["Casual", "Professional", "Festive", "Urgent", "Friendly", "Luxury"];
const PERSONAL_TONES = ["Casual", "Aesthetic", "Funny", "Inspirational", "Romantic", "Chill", "Festive"];
const platforms = ["Instagram", "WhatsApp", "Facebook", "Google Ads"];
const languages = ["English", "Hinglish", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali"];
const PERSONAL_TYPES: ContentType[] = ["caption", "hashtag"];
const BUSINESS_TYPES: ContentType[] = ["caption", "product", "ad", "hashtag"];

export const GeneratorForm = ({ onGenerate, loading, brandVoice, mode }: Props) => {
  const isPersonal = mode === "personal";
  const [type, setType] = useState<ContentType>("caption");
  const [name, setName] = useState(brandVoice?.businessName ?? "");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [platform, setPlatform] = useState(brandVoice?.platform ?? "Instagram");
  const [tone, setTone] = useState(brandVoice?.tone ?? "Casual");
  const [language, setLanguage] = useState(brandVoice?.language ?? "English");
  const [festival, setFestival] = useState("None");
  const [emojis, setEmojis] = useState(true);
  const [autoFestival, setAutoFestival] = useState<string | null>(null);

  // Reset form when mode switches
  useEffect(() => {
    setDescription("");
    setType("caption");
    setTone(isPersonal ? "Casual" : (brandVoice?.tone ?? "Casual"));
    if (!isPersonal && brandVoice) {
      setName(brandVoice.businessName);
      setPlatform(brandVoice.platform);
      setLanguage(brandVoice.language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const detected = detectCurrentFestival();
    if (detected) { setAutoFestival(detected.name); setFestival(detected.name); }
  }, []);

  useEffect(() => {
    if (brandVoice && !isPersonal) {
      setName(brandVoice.businessName);
      setTone(brandVoice.tone);
      setLanguage(brandVoice.language);
      setPlatform(brandVoice.platform);
    }
  }, [brandVoice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onGenerate({
      type,
      businessName: isPersonal ? (name || "my account") : name,
      description: !isPersonal && brandVoice?.usp ? `${description}\n\nBrand USPs: ${brandVoice.usp}` : description,
      platform: isPersonal ? "Instagram" : platform,
      tone, price, language,
      festival: festival === "None" ? "" : festival,
      emojis, mode,
    });
  };

  const tones = isPersonal ? PERSONAL_TONES : BUSINESS_TONES;
  const contentTypes = isPersonal ? PERSONAL_TYPES : BUSINESS_TYPES;
  const limit = !isPersonal ? PLATFORM_LIMITS[platform] : undefined;
  const descCount = description.length;
  const ctaLabel = type === "caption" ? "Captions" : type === "product" ? "Description" : type === "ad" ? "Ad Copy" : "Hashtags";

  const nameLabel = isPersonal ? "Your name / handle (optional)" : "Business name";
  const namePlaceholder = isPersonal ? "e.g. Priya, @priya.travels" : "e.g. Anaya's Boutique";
  const descLabel = type === "hashtag"
    ? (isPersonal ? "Your niche / interests / vibe" : "Niche / product / keywords")
    : isPersonal ? "What's this post about?" : "What are you selling or promoting?";
  const descPlaceholder = type === "hashtag"
    ? (isPersonal ? "e.g. travel, food, lifestyle, Mumbai" : "e.g. handloom sarees, ethnic wear, Bangalore boutique")
    : isPersonal
    ? "e.g. sunset at Goa, birthday dinner with friends, new haircut, feeling good today"
    : "e.g. Handloom cotton sarees, Diwali festive collection, free shipping above ₹999";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <Tabs value={type} onValueChange={(v) => setType(v as ContentType)}>
        <TabsList className={`grid w-full bg-muted ${isPersonal ? "grid-cols-2" : "grid-cols-4"}`}>
          {contentTypes.map((ct) => (
            <TabsTrigger key={ct} value={ct}>
              {ct === "caption" ? "Caption" : ct === "product" ? "Product" : ct === "ad" ? "Ad Copy" : "Hashtags"}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 grid gap-5">
        {brandVoice && !isPersonal && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Brand voice active — fields pre-filled from your saved profile.
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="name">{nameLabel}</Label>
          <Input id="name" placeholder={namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required={!isPersonal} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="desc">{descLabel}</Label>
          <Textarea id="desc" placeholder={descPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
          {limit && type !== "hashtag" && (
            <p className={`text-xs ${descCount > limit.max ? "text-destructive" : "text-muted-foreground"}`}>
              {getCounterLabel(platform, descCount)}
            </p>
          )}
        </div>

        {type === "product" && !isPersonal && (
          <div className="grid gap-2">
            <Label htmlFor="price">Price (optional)</Label>
            <Input id="price" placeholder="e.g. ₹1,499" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        )}

        <div className={`grid gap-5 ${isPersonal ? "grid-cols-1" : "sm:grid-cols-2"}`}>
          {!isPersonal && (
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              {isPersonal ? "Occasion (optional)" : "Festival"}
              {autoFestival && festival === autoFestival && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                  <CalendarDays className="h-3 w-3" /> Auto-detected
                </span>
              )}
            </Label>
            <Select value={festival} onValueChange={setFestival}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_FESTIVALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {type !== "hashtag" && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div>
              <Label htmlFor="emojis" className="cursor-pointer">Use emojis</Label>
              <p className="text-xs text-muted-foreground">Add tasteful emojis to the copy</p>
            </div>
            <Switch id="emojis" checked={emojis} onCheckedChange={setEmojis} />
          </div>
        )}

        <Button type="submit" variant="hero" size="lg" disabled={loading} className="mt-2">
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-5 w-5" /> Generate {ctaLabel}</>}
        </Button>
      </div>
    </form>
  );
};
