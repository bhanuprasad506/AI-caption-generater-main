import { useState } from "react";
import { User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OutputCard } from "@/components/OutputCard";
import { toast } from "sonner";
import { useGenerate } from "@/hooks/useGenerate";

type BioType = "instagram" | "linkedin";
const BUSINESS_TONES = ["Casual", "Professional", "Friendly", "Luxury", "Bold"];
const PERSONAL_TONES = ["Casual", "Aesthetic", "Funny", "Inspirational", "Chill", "Bold"];
const languages = ["English", "Hinglish", "Hindi"];

interface Props {
  defaultBusinessName?: string;
  defaultTone?: string;
  mode?: "personal" | "business";
}

export const BioGenerator = ({ defaultBusinessName = "", defaultTone = "Casual", mode = "business" }: Props) => {
  const isPersonal = mode === "personal";
  const { generate, loading } = useGenerate();
  const [bioType, setBioType] = useState<BioType>("instagram");
  const [name, setName] = useState(defaultBusinessName);
  const [niche, setNiche] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tone, setTone] = useState(defaultTone);
  const [language, setLanguage] = useState("English");
  const [outputs, setOutputs] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!niche.trim()) { toast.error(isPersonal ? "Tell us what you are about" : "Please fill in what you do/sell"); return; }
    try {
      const results = await generate({
        type: "bio",
        bioType,
        mode,
        businessName: name || (isPersonal ? "my profile" : "my business"),
        description: isPersonal
          ? `About me: ${niche}. Fun facts/highlights: ${highlights || "none"}`
          : `Niche: ${niche}. USPs: ${highlights || "not specified"}`,
        tone,
        language,
      });
      setOutputs(results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const tones = isPersonal ? PERSONAL_TONES : BUSINESS_TONES;

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
          <User className="h-5 w-5 text-purple-600" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">Bio Generator</h3>
          <p className="text-sm text-muted-foreground">
            {isPersonal ? "Personal Instagram & LinkedIn bios" : "Instagram & LinkedIn bios for businesses"}
          </p>
        </div>
      </div>

      <Tabs value={bioType} onValueChange={(v) => setBioType(v as BioType)}>
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="bio-name">{isPersonal ? "Your name / handle (optional)" : "Business / Brand name"}</Label>
          <Input id="bio-name" placeholder={isPersonal ? "e.g. Priya, @priya.travels" : "e.g. Anaya Boutique"} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio-niche">{isPersonal ? "What are you about? *" : "What do you do / sell? *"}</Label>
          <Input id="bio-niche"
            placeholder={isPersonal
              ? bioType === "instagram" ? "e.g. travel lover, foodie, photographer based in Mumbai" : "e.g. Software engineer, 5 years experience, building cool products"
              : bioType === "instagram" ? "e.g. Handloom sarees & ethnic wear" : "e.g. Founder of handloom fashion brand, 500+ happy customers"}
            value={niche} onChange={(e) => setNiche(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio-highlights">{isPersonal ? "Fun facts / highlights (optional)" : "Key USPs / highlights (optional)"}</Label>
          <Textarea id="bio-highlights"
            placeholder={isPersonal ? "e.g. chai addict, dog mom, Bangalore, love sunsets" : "e.g. Women-owned, free shipping, 5 star rated, DM to order"}
            value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" variant="hero" size="lg" disabled={loading} onClick={handleGenerate} className="mt-1">
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Writing bio...</> : <><Sparkles className="mr-2 h-5 w-5" /> Generate bios</>}
        </Button>
      </div>

      {outputs.length > 0 && (
        <div className="mt-6 grid gap-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{bioType === "instagram" ? "Instagram" : "LinkedIn"} bios</h4>
          {outputs.map((text, i) => (
            <OutputCard key={i} index={outputs.length > 1 ? i : undefined} text={text} platform={bioType === "instagram" ? "Instagram" : undefined} contentType="bio" />
          ))}
        </div>
      )}
    </div>
  );
};
