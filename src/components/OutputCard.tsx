import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  index?: number;
  text: string;
  label?: string;
}

export const OutputCard = ({ index, text, label }: Props) => {
  const [copied, setCopied] = useState(false);

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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="opacity-80 hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-4 w-4 text-accent" /> Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </>
          )}
        </Button>
      </header>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
    </article>
  );
};
