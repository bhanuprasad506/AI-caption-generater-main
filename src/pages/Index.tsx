import { useMemo, useState } from "react";
import { Sparkles, Zap, Languages, Smartphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GeneratorForm, type GenerateInput } from "@/components/GeneratorForm";
import { OutputCard } from "@/components/OutputCard";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero.jpg";

interface OutputItem {
  text: string;
  label?: string;
}

function parseOutput(type: GenerateInput["type"], raw: string): OutputItem[] {
  const cleaned = raw.trim();
  if (type === "caption") {
    // Split on numbered markers like "1." or "1)"
    const parts = cleaned
      .split(/\n\s*(?=\d{1,2}[\.\)]\s)/)
      .map((p) => p.replace(/^\d{1,2}[\.\)]\s*/, "").trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts.map((text) => ({ text }));
    return [{ text: cleaned }];
  }
  if (type === "ad") {
    return [{ text: cleaned, label: "Ad copy" }];
  }
  return [{ text: cleaned, label: "Product description" }];
}

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [lastType, setLastType] = useState<GenerateInput["type"]>("caption");
  const [lastInput, setLastInput] = useState<GenerateInput | null>(null);

  const handleGenerate = async (input: GenerateInput) => {
    setLoading(true);
    setOutputs([]);
    setLastType(input.type);
    setLastInput(input);
    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text: string = data?.text ?? "";
      if (!text) throw new Error("No content returned. Please try again.");
      setOutputs(parseOutput(input.type, text));
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!lastInput) return;
    await handleGenerate({
      ...lastInput,
      variant: (lastInput.variant ?? 0) + 1,
    });
  };

  const heading = useMemo(() => {
    if (lastType === "caption") return "Your captions";
    if (lastType === "product") return "Your product description";
    return "Your ad copy";
  }, [lastType]);

  return (
    <div className="min-h-screen bg-gradient-warm font-sans text-foreground">
      {/* Header */}
      <header className="container flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </span>
          WriteRight
        </a>
        <a
          href="#generator"
          className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
        >
          Try it free
        </a>
      </header>

      {/* Hero */}
      <section className="container grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Built for Indian small businesses & creators
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
            Captions, product copy &{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">ads in seconds</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Stop spending hours writing for Instagram, WhatsApp and Facebook. Generate
            ready-to-post copy that actually sounds like your brand — in under 10 seconds.
          </p>
          <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> 10-second copy
            </div>
            <div className="inline-flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" /> Mobile-first
            </div>
            <div className="inline-flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" /> Indian-market tone
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-hero opacity-20 blur-3xl" aria-hidden />
          <img
            src={heroImage}
            alt="AI content generation illustration with phone, chat bubbles and warm gradients"
            width={1280}
            height={1024}
            className="relative w-full rounded-3xl border border-border object-cover shadow-elevated"
          />
        </div>
      </section>

      {/* Generator */}
      <section id="generator" className="container grid gap-8 pb-20 md:grid-cols-5 md:pb-28">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Generate your content</h2>
          <p className="mt-2 text-muted-foreground">
            Pick what you need, fill in a few details, and get post-ready copy instantly.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "3 caption variants per request",
              "WhatsApp-ready product descriptions with CTA",
              "Hook + body + CTA ad copy",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-foreground/80">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <GeneratorForm onGenerate={handleGenerate} loading={loading} />
        </div>
      </section>

      {/* Results */}
      {(loading || outputs.length > 0) && (
        <section id="results" className="container pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">{heading}</h2>
              <p className="mt-2 text-muted-foreground">
                Tap copy and paste straight into your post.
              </p>
            </div>
            {outputs.length > 0 && !loading && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerate}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading &&
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl border border-border bg-gradient-to-r from-muted via-card to-muted bg-[length:200%_100%] animate-shimmer"
                />
              ))}
            {!loading &&
              outputs.map((o, i) => (
                <OutputCard key={i} index={outputs.length > 1 ? i : undefined} text={o.text} label={o.label} />
              ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} WriteRight. Made for Indian businesses.</p>
          <p className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
