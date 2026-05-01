import { useState } from "react";
import { Check, Copy, Scissors, Sparkles, Loader2, Star, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PLATFORM_LIMITS, countWords, getCounterLabel } from "@/lib/platformLimits";
import { saveOutput } from "@/components/SavedLibrary";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  index?: number;
  text: string;
  label?: string;
  platform?: string;
  contentType?: string;
  businessName?: string;
  language?: string;
  onRefine?: (mode: "shorter" | "festive") => Promise<void> | void;
  refining?: "shorter" | "festive" | null;
  onDownloadPoster?: () => void;
}

export const OutputCard = ({
  index,
  text,
  label,
  platform,
  contentType,
  businessName,
  language,
  onRefine,
  refining,
  onDownloadPoster,
}: Props) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Sign in to save outputs to your library");
      return;
    }
    setSaving(true);
    const ok = await saveOutput(user.id, {
      content_type: contentType ?? "caption",
      text,
      label,
      platform,
      language,
      business_name: businessName,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      toast.success("Saved to library");
    } else {
      toast.error("Couldn't save. Please try again.");
    }
  };

  const charCount = text.length;
  const wordCount = countWords(text);
  const limit = platform ? PLATFORM_LIMITS[platform] : undefined;
  const overLimit = limit ? charCount > limit.max : false;

  return (
    <article className="group relative animate-fade-up rounded-xl border border-border bg-card p-5 shadow-soft transition-smooth hover:shadow-elevated">
      <header className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          {typeof index === "number" && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              {index + 1}
            </span>
          )}
          {label ?? `Variant ${typeof index === "number" ? index + 1 : ""}`}
        </span>
        <div className="flex items-center gap-1">
          {/* Save to library */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={saving || saved}
            className="opacity-80 hover:opacity-100"
            title="Save to library"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Star className="h-4 w-4 fill-primary text-primary" />
            ) : (
              <Star className="h-4 w-4" />
            )}
          </Button>
          {/* Poster download */}
          {onDownloadPoster && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDownloadPoster}
              className="opacity-80 hover:opacity-100"
              title="Download as poster"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {/* Copy */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="opacity-80 hover:opacity-100"
          >
            {copied ? (
              <><Check className="mr-1.5 h-4 w-4 text-accent" /> Copied</>
            ) : (
              <><Copy className="mr-1.5 h-4 w-4" /> Copy</>
            )}
          </Button>
        </div>
      </header>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {limit
            ? getCounterLabel(platform!, charCount)
            : `${charCount} chars · ${wordCount} words`}
        </p>
        {onRefine && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRefine("shorter")}
              disabled={!!refining}
              className="h-8 text-xs"
            >
              {refining === "shorter" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Scissors className="mr-1 h-3.5 w-3.5" />
              )}
              Shorter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRefine("festive")}
              disabled={!!refining}
              className="h-8 text-xs"
            >
              {refining === "festive" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" />
              )}
              More festive
            </Button>
          </div>
        )}
      </footer>
    </article>
  );
};
