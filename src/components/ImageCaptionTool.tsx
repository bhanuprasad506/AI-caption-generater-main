import { useRef, useState } from "react";
import { Camera, Upload, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OutputCard } from "@/components/OutputCard";
import { toast } from "sonner";
import { useGenerate } from "@/hooks/useGenerate";

const tones = ["Casual", "Aesthetic", "Funny", "Inspirational", "Professional", "Festive"];
const languages = ["English", "Hinglish", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali"];

interface Props {
  defaultBusinessName?: string;
  defaultTone?: string;
  defaultLanguage?: string;
  mode?: "personal" | "business";
}

export const ImageCaptionTool = ({ defaultBusinessName = "", defaultTone = "Casual", defaultLanguage = "English", mode = "business" }: Props) => {
  const isPersonal = mode === "personal";
  const { generate, loading } = useGenerate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [tone, setTone] = useState(defaultTone);
  const [language, setLanguage] = useState(defaultLanguage);
  const [extraContext, setExtraContext] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        setPreview(compressed); setBase64(compressed.split(",")[1]); setMimeType("image/jpeg");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    setOutputs([]);
  };

  const handleGenerate = async () => {
    if (!base64) { toast.error("Please upload a photo first"); return; }
    try {
      const results = await generate({
        type: "image_caption",
        mode,
        businessName: defaultBusinessName || undefined,
        description: extraContext.trim(),
        tone,
        language,
        imageBase64: base64,
        imageMimeType: mimeType,
      });
      setOutputs(results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const clearImage = () => { setPreview(null); setBase64(null); setOutputs([]); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Camera className="h-5 w-5 text-primary" /></span>
        <div>
          <h3 className="font-display text-lg font-bold">Image Caption Generator</h3>
          <p className="text-sm text-muted-foreground">{isPersonal ? "Upload any photo — AI writes personal captions for it" : "Upload a product photo — AI writes captions for it"}</p>
        </div>
      </div>

      {!preview ? (
        <div onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-smooth hover:border-primary/50 hover:bg-muted/50">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{isPersonal ? "Drop any photo here" : "Drop your product photo here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{isPersonal ? "selfie, travel, food, anything" : "product, store, team"} · JPG, PNG, WEBP · max 10 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full rounded-xl border border-border object-cover" style={{ maxHeight: 280 }} />
          <Button type="button" size="icon" variant="secondary" onClick={clearImage} className="absolute right-2 top-2 h-7 w-7 rounded-full"><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="img-context">{isPersonal ? "Describe your photo (optional)" : "Extra context (optional)"}</Label>
          <Textarea id="img-context"
            placeholder={isPersonal ? "e.g. sunset at Goa, my birthday dinner, hiking in Manali..." : "e.g. Handloom cotton saree, Diwali collection, Rs 1499"}
            value={extraContext} onChange={(e) => setExtraContext(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2"><Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" variant="hero" size="lg" disabled={loading || !base64} onClick={handleGenerate} className="mt-1">
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analysing photo...</> : <><Sparkles className="mr-2 h-5 w-5" /> Generate captions</>}
        </Button>
      </div>

      {outputs.length > 0 && (
        <div className="mt-6 grid gap-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Generated captions</h4>
          {outputs.map((text, i) => <OutputCard key={i} index={outputs.length > 1 ? i : undefined} text={text} platform="Instagram" contentType="image_caption" />)}
        </div>
      )}
    </div>
  );
};
