import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_LIMITS, getCounterLabel } from "@/lib/platformLimits";

export type ContentType = "caption" | "product" | "ad" | "hashtag";

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
}

interface Props {
  onGenerate: (input: GenerateInput) => void;
  loading: boolean;
}

const tones = ["Casual", "Professional", "Festive", "Urgent"];
const platforms = ["Instagram", "WhatsApp", "Facebook", "Google Ads"];
const languages = ["English", "Hinglish", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali"];
const festivals = [
  "None",
  "Diwali",
  "Holi",
  "Eid",
  "Raksha Bandhan",
  "Onam",
  "Pongal",
  "Navratri",
  "Ganesh Chaturthi",
  "Christmas",
  "New Year",
  "Republic Day",
  "Independence Day",
];

export const GeneratorForm = ({ onGenerate, loading }: Props) => {
  const [type, setType] = useState<ContentType>("caption");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Casual");
  const [language, setLanguage] = useState("English");
  const [festival, setFestival] = useState("None");
  const [emojis, setEmojis] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !description.trim()) return;
    onGenerate({
      type,
      businessName,
      description,
      platform,
      tone,
      price,
      language,
      festival: festival === "None" ? "" : festival,
      emojis,
    });
  };

  const limit = PLATFORM_LIMITS[platform];
  const descCount = description.length;

  const ctaLabel =
    type === "caption"
      ? "Captions"
      : type === "product"
      ? "Description"
      : type === "ad"
      ? "Ad Copy"
      : "Hashtags";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8"
    >
      <Tabs value={type} onValueChange={(v) => setType(v as ContentType)}>
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="caption">Caption</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="ad">Ad Copy</TabsTrigger>
          <TabsTrigger value="hashtag">Hashtags</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-6 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="business">Business name</Label>
          <Input
            id="business"
            placeholder="e.g. Anaya's Boutique"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="desc">
            {type === "product"
              ? "Product details"
              : type === "hashtag"
              ? "Niche / product / keywords"
              : "What are you selling or promoting?"}
          </Label>
          <Textarea
            id="desc"
            placeholder={
              type === "hashtag"
                ? "e.g. handloom sarees, ethnic wear, Bangalore boutique"
                : "e.g. Handloom cotton sarees, Diwali festive collection, free shipping above ₹999"
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
          {limit && type !== "hashtag" && (
            <p
              className={`text-xs ${
                descCount > limit.max ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {getCounterLabel(platform, descCount)}
            </p>
          )}
        </div>

        {type === "product" && (
          <div className="grid gap-2">
            <Label htmlFor="price">Price (optional)</Label>
            <Input
              id="price"
              placeholder="e.g. ₹1,499"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tones.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Festival (optional)</Label>
            <Select value={festival} onValueChange={setFestival}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {festivals.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
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

        <Button
          type="submit"
          variant="hero"
          size="lg"
          disabled={loading}
          className="mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate {ctaLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
