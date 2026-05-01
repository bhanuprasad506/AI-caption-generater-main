import { useRef, useState } from "react";
import { Download, Image as ImageIcon, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const THEMES = [
  { id: "diwali", label: "🪔 Diwali", bg: "#1a0a00", accent: "#f59e0b", text: "#fef3c7" },
  { id: "holi", label: "🎨 Holi", bg: "#1e1b4b", accent: "#ec4899", text: "#fdf4ff" },
  { id: "modern", label: "✨ Modern", bg: "#0f172a", accent: "#6366f1", text: "#f8fafc" },
  { id: "warm", label: "🌅 Warm", bg: "#7c2d12", accent: "#fb923c", text: "#fff7ed" },
  { id: "fresh", label: "🌿 Fresh", bg: "#052e16", accent: "#22c55e", text: "#f0fdf4" },
  { id: "royal", label: "👑 Royal", bg: "#1e1b4b", accent: "#a855f7", text: "#faf5ff" },
];

interface Props {
  defaultCaption?: string;
  defaultBusinessName?: string;
}

export const PosterGenerator = ({ defaultCaption = "", defaultBusinessName = "" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [theme, setTheme] = useState("modern");
  const [productImage, setProductImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreviewUrl(url);
      const img = new Image();
      img.onload = () => setProductImage(img);
      img.src = url;
    };
    reader.readAsDataURL(file);
    setPosterUrl(null);
  };

  const generatePoster = async () => {
    if (!caption.trim()) { toast.error("Please enter a caption"); return; }
    setGenerating(true);
    setPosterUrl(null);

    try {
      const canvas = canvasRef.current!;
      const W = 1080, H = 1080;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const t = THEMES.find((th) => th.id === theme) ?? THEMES[2];

      // Background
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, W, H);

      // Decorative gradient overlay
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      grad.addColorStop(0, t.accent + "22");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Accent border
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      // Inner border
      ctx.strokeStyle = t.accent + "44";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      // Product image (top half)
      if (productImage) {
        const imgArea = { x: 60, y: 60, w: W - 120, h: 480 };
        // Clip to rounded rect
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h, 20);
        ctx.clip();
        // Cover fit
        const scale = Math.max(imgArea.w / productImage.width, imgArea.h / productImage.height);
        const sw = productImage.width * scale;
        const sh = productImage.height * scale;
        const sx = imgArea.x + (imgArea.w - sw) / 2;
        const sy = imgArea.y + (imgArea.h - sh) / 2;
        ctx.drawImage(productImage, sx, sy, sw, sh);
        ctx.restore();
        // Gradient fade at bottom of image
        const fadeGrad = ctx.createLinearGradient(0, imgArea.y + imgArea.h - 80, 0, imgArea.y + imgArea.h);
        fadeGrad.addColorStop(0, "transparent");
        fadeGrad.addColorStop(1, t.bg);
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(imgArea.x, imgArea.y + imgArea.h - 80, imgArea.w, 80);
      }

      // Caption text
      const textY = productImage ? 590 : 200;
      ctx.fillStyle = t.text;
      ctx.textAlign = "center";

      // Wrap caption
      const maxWidth = W - 120;
      const lineHeight = 44;
      ctx.font = `bold 32px 'Plus Jakarta Sans', system-ui, sans-serif`;
      const words = caption.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);

      // Limit to 6 lines
      const displayLines = lines.slice(0, 6);
      const totalTextH = displayLines.length * lineHeight;
      let ty = textY;
      for (const line of displayLines) {
        ctx.fillText(line, W / 2, ty);
        ty += lineHeight;
      }

      // Business name
      if (businessName) {
        ctx.font = `600 24px 'Plus Jakarta Sans', system-ui, sans-serif`;
        ctx.fillStyle = t.accent;
        ctx.fillText(businessName.toUpperCase(), W / 2, H - 80);
      }

      // Accent dot decoration
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(W / 2, textY - 30, 5, 0, Math.PI * 2);
      ctx.fill();

      // Export
      const url = canvas.toDataURL("image/jpeg", 0.92);
      setPosterUrl(url);
      toast.success("Poster ready! Click Download to save.");
    } catch (e) {
      toast.error("Failed to generate poster");
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement("a");
    a.href = posterUrl;
    a.download = `writeright-poster-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
          <Palette className="h-5 w-5 text-orange-600" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">Poster Generator</h3>
          <p className="text-sm text-muted-foreground">
            Combine your caption + product photo into a shareable 1080×1080 JPG
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Controls */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="poster-caption">Caption *</Label>
            <Textarea
              id="poster-caption"
              placeholder="Paste your caption here…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="poster-biz">Business name</Label>
            <Input
              id="poster-biz"
              placeholder="e.g. Anaya's Boutique"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Product image (optional)</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-smooth hover:border-primary/50 hover:bg-muted/50"
            >
              <ImageIcon className="h-5 w-5 shrink-0" />
              {previewUrl ? "Change image" : "Upload product photo"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
            </div>
            {previewUrl && (
              <img src={previewUrl} alt="Product" className="h-20 w-20 rounded-lg object-cover border border-border" />
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="hero"
              className="flex-1 gap-2"
              onClick={generatePoster}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Palette className="h-4 w-4" /> Generate poster</>
              )}
            </Button>
            {posterUrl && (
              <Button type="button" variant="outline" onClick={downloadPoster} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} className="hidden" />
          {posterUrl ? (
            <>
              <img
                src={posterUrl}
                alt="Generated poster"
                className="w-full max-w-xs rounded-xl border border-border shadow-elevated"
              />
              <Button type="button" onClick={downloadPoster} className="gap-2 w-full max-w-xs">
                <Download className="h-4 w-4" /> Download JPG
              </Button>
            </>
          ) : (
            <div className="flex w-full max-w-xs flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
              <Palette className="h-10 w-10 opacity-30" />
              <p>Your poster preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
