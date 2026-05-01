import { useState } from "react";
import { BookMarked, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { type BrandVoice, saveBrandVoice, clearBrandVoice } from "@/lib/brandVoice";

const tones = ["Casual", "Professional", "Festive", "Urgent", "Friendly", "Luxury"];
const languages = ["English", "Hinglish", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali"];
const platforms = ["Instagram", "WhatsApp", "Facebook", "Google Ads"];

interface Props {
  voice: BrandVoice | null;
  onSave: (voice: BrandVoice) => void;
  onClear: () => void;
}

export const BrandVoicePanel = ({ voice, onSave, onClear }: Props) => {
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState(voice?.businessName ?? "");
  const [tone, setTone] = useState(voice?.tone ?? "Casual");
  const [usp, setUsp] = useState(voice?.usp ?? "");
  const [language, setLanguage] = useState(voice?.language ?? "English");
  const [platform, setPlatform] = useState(voice?.platform ?? "Instagram");

  const handleSave = () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    const v: BrandVoice = { businessName, tone, usp, language, platform };
    saveBrandVoice(v);
    onSave(v);
    toast.success("Brand voice saved! It'll auto-fill your forms.");
    setOpen(false);
  };

  const handleClear = () => {
    clearBrandVoice();
    onClear();
    setBusinessName("");
    setTone("Casual");
    setUsp("");
    setLanguage("English");
    setPlatform("Instagram");
    toast.success("Brand voice cleared");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookMarked className="h-4 w-4" />
          Brand Voice
          {voice && (
            <span className="flex h-2 w-2 rounded-full bg-accent" title="Saved" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            Brand Voice Memory
          </SheetTitle>
          <SheetDescription>
            Save your business details once. They'll auto-fill every time you generate content.
          </SheetDescription>
        </SheetHeader>

        {voice && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            <span>Brand voice is active — forms auto-fill with your details.</span>
          </div>
        )}

        <div className="mt-6 grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="bv-name">Business name *</Label>
            <Input
              id="bv-name"
              placeholder="e.g. Anaya's Boutique"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bv-usp">USPs / Tagline</Label>
            <Textarea
              id="bv-usp"
              placeholder="e.g. Handloom sarees, free shipping above ₹999, trusted since 2015, women-owned"
              value={usp}
              onChange={(e) => setUsp(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These will be woven into your generated copy automatically.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Default tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Default language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Default platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="button" className="flex-1 gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save brand voice
            </Button>
            {voice && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
                title="Clear brand voice"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
