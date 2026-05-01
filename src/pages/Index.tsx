import { useEffect, useMemo, useState } from "react";
import { Sparkles, Zap, Languages, Smartphone, RefreshCw, Camera, MessageCircle, User, MessageSquareReply, Calendar, Palette, LogIn, LogOut, Crown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { callGemini, buildPrompt } from "@/lib/gemini";
import { GeneratorForm, type GenerateInput } from "@/components/GeneratorForm";
import { OutputCard } from "@/components/OutputCard";
import { HistoryPanel, type HistoryEntry } from "@/components/HistoryPanel";
import { BrandVoicePanel } from "@/components/BrandVoicePanel";
import { ImageCaptionTool } from "@/components/ImageCaptionTool";
import { WhatsAppTemplates } from "@/components/WhatsAppTemplates";
import { BioGenerator } from "@/components/BioGenerator";
import { ReplyGenerator } from "@/components/ReplyGenerator";
import { ScheduledPosting } from "@/components/ScheduledPosting";
import { PosterGenerator } from "@/components/PosterGenerator";
import { SavedLibrary } from "@/components/SavedLibrary";
import { AuthModal } from "@/components/AuthModal";
import { PricingModal } from "@/components/PricingModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import heroImage from "@/assets/hero.jpg";
import { loadBrandVoice, type BrandVoice } from "@/lib/brandVoice";
import { setUnlocked, isUnlocked } from "@/lib/razorpay";
import { detectCurrentFestival } from "@/lib/festivalDetector";
import { useAuth } from "@/hooks/useAuth";
import { useUsage } from "@/hooks/useUsage";

interface OutputItem {
  text: string;
  label?: string;
}

function parseOutput(type: GenerateInput["type"], raw: string): OutputItem[] {
  const cleaned = raw.trim();
  if (type === "caption") {
    const parts = cleaned
      .split(/\n\s*(?=\d{1,2}[\.\)]\s)/)
      .map((p) => p.replace(/^\d{1,2}[\.\)]\s*/, "").trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts.map((text) => ({ text }));
    return [{ text: cleaned }];
  }
  if (type === "hashtag") {
    const tags = cleaned.split(/\n+/).map((l) => l.replace(/^[-*\d\.\)\s]+/, "").trim()).filter((l) => l.startsWith("#"));
    const all = tags.length > 0 ? tags.join(" ") : cleaned;
    return [{ text: all, label: `${tags.length || ""} hashtags`.trim() }];
  }
  if (type === "ad") return [{ text: cleaned, label: "Ad copy" }];
  return [{ text: cleaned, label: "Product description" }];
}

const HISTORY_KEY = "writeright.history.v1";
const HISTORY_MAX = 10;

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const { canGenerate, remaining, unlocked, recordUsage, fetchUsage, FREE_DAILY_LIMIT } = useUsage();
  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [lastType, setLastType] = useState<GenerateInput["type"]>("caption");
  const [lastInput, setLastInput] = useState<GenerateInput | null>(null);
  const [refiningIdx, setRefiningIdx] = useState<{ idx: number; mode: "shorter" | "festive" } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [activeTool, setActiveTool] = useState("generator");
  const [authOpen, setAuthOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [appMode, setAppMode] = useState<"personal" | "business">("business");

  // Reset to generator tab when mode switches
  useEffect(() => {
    setActiveTool("generator");
    setOutputs([]);
  }, [appMode]);
  const currentFestival = useMemo(() => detectCurrentFestival(), []);

  useEffect(() => {
    try { const raw = localStorage.getItem(HISTORY_KEY); if (raw) setHistory(JSON.parse(raw)); } catch { /* ignore */ }
    setBrandVoice(loadBrandVoice());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setUnlocked();
      fetchUsage(); // refresh canGenerate / unlocked state
      toast.success("Payment successful! You now have lifetime access ��");
      window.history.replaceState({}, "", "/");
    } else if (params.get("payment") === "cancelled") {
      toast.info("Payment cancelled.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const persistHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
  };

  const addToHistory = (input: GenerateInput, items: OutputItem[]) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(), type: input.type, businessName: input.businessName,
      description: input.description, platform: input.platform, language: input.language,
      preview: items[0]?.text.slice(0, 140) ?? "", outputs: items,
    };
    persistHistory([entry, ...history].slice(0, HISTORY_MAX));
  };

  const handleGenerate = async (input: GenerateInput) => {
    if (!canGenerate) { setPricingOpen(true); return; }
    setLoading(true); setOutputs([]); setLastType(input.type); setLastInput(input);
    try {
      const prompt = buildPrompt({ ...input, description: input.description });
      const text = await callGemini([{ text: prompt }], "You are an expert copywriter for Indian creators and businesses. Write clear, engaging, culturally aware copy. Follow output formatting rules exactly. Never include preamble or explanations.");
      const parsed = parseOutput(input.type, text);
      setOutputs(parsed); addToHistory(input, parsed); await recordUsage();
      setTimeout(() => { document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      if (msg.includes("limit reached")) setPricingOpen(true);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleRegenerate = async () => { if (!lastInput) return; await handleGenerate({ ...lastInput, variant: (lastInput.variant ?? 0) + 1 }); };

  const handleRefine = async (idx: number, mode: "shorter" | "festive") => {
    if (!lastInput) return;
    const target = outputs[idx]; if (!target) return;
    setRefiningIdx({ idx, mode });
    try {
      const prompt = buildPrompt({ ...lastInput, refine: mode, refineText: target.text });
      const text = await callGemini([{ text: prompt }], "You are an expert copywriter. Follow output formatting rules exactly.");
      if (!text) throw new Error("No content returned.");
      const next = [...outputs]; next[idx] = { ...target, text: text.trim() }; setOutputs(next);
      toast.success(mode === "shorter" ? "Made it shorter" : "Added more festive vibes");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't refine"); }
    finally { setRefiningIdx(null); }
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setOutputs(entry.outputs); setLastType(entry.type);
    setLastInput({ type: entry.type, businessName: entry.businessName, description: entry.description, platform: entry.platform, tone: "Casual", language: entry.language, festival: "", emojis: true, mode: appMode });
    setActiveTool("generator");
    setTimeout(() => { document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
  };

  const heading = useMemo(() => {
    if (lastType === "caption") return "Your captions";
    if (lastType === "product") return "Your product description";
    if (lastType === "hashtag") return "Your hashtags";
    return "Your ad copy";
  }, [lastType]);

  return (
    <div className="min-h-screen bg-gradient-warm font-sans text-foreground">
      {currentFestival && (
        <div className="bg-gradient-hero py-2 text-center text-sm font-medium text-primary-foreground">
          {currentFestival.emoji} {currentFestival.greeting} — Festival mode is active!
        </div>
      )}
      <header className="container flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </span>
          WriteRight
        </a>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Personal / Business toggle */}
          <div className="flex items-center rounded-full border border-border bg-muted p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setAppMode("personal")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${appMode === "personal" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              👤 Personal
            </button>
            <button
              type="button"
              onClick={() => setAppMode("business")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${appMode === "business" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              🏪 Business
            </button>
          </div>
          {/* Lifetime Access badge — always visible when unlocked */}
          {unlocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Lifetime Access
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />{remaining}/{FREE_DAILY_LIMIT} free today
            </span>
          )}
          {user && profile && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              {profile.tier === "pro" ? (
                <><Crown className="h-3.5 w-3.5 text-primary" /> Pro</>
              ) : (
                <>{profile.credits > 0 ? `${profile.credits} credits` : `${remaining}/${FREE_DAILY_LIMIT} free`}</>
              )}
            </span>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setPricingOpen(true)} className="gap-1.5">
            <Crown className="h-4 w-4" /><span className="hidden sm:inline">Get credits</span>
          </Button>
          <BrandVoicePanel voice={brandVoice} onSave={setBrandVoice} onClear={() => setBrandVoice(null)} />
          {user && <SavedLibrary savedCount={savedCount} onSavedCountChange={setSavedCount} />}
          <HistoryPanel entries={history} onRestore={handleRestoreHistory} onClear={() => { persistHistory([]); toast.success("History cleared"); }} />
          {user ? (
            <Button type="button" size="sm" variant="ghost" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setAuthOpen(true)} className="gap-2">
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          )}
        </div>
      </header>

      <section className="container grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Built for Indian small businesses &amp; creators
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
            Captions, product copy &amp;{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">ads in seconds</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Stop spending hours writing for Instagram, WhatsApp and Facebook. Generate ready-to-post copy that actually sounds like your brand.
          </p>
          <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> 10-second copy</div>
            <div className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Mobile-first</div>
            <div className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-primary" /> Indian-market tone</div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-hero opacity-20 blur-3xl" aria-hidden />
          <img src={heroImage} alt="AI content generation" width={1280} height={1024} className="relative w-full rounded-3xl border border-border object-cover shadow-elevated" />
        </div>
      </section>

      <section id="generator" className="container pb-20 md:pb-28">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Your AI content toolkit</h2>
          <p className="mt-2 text-muted-foreground">Everything you need — {appMode === "personal" ? "for your personal brand" : "to market your business"}.</p>
        </div>
        <Tabs value={activeTool} onValueChange={setActiveTool}>
          <TabsList className="mb-8 flex h-auto flex-wrap gap-1 bg-muted p-1">
            <TabsTrigger value="generator" className="gap-1.5"><Sparkles className="h-4 w-4" /> {appMode === "personal" ? "Captions" : "Generator"}</TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5"><Camera className="h-4 w-4" /> Photo Caption</TabsTrigger>
            {appMode === "business" && <TabsTrigger value="whatsapp" className="gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</TabsTrigger>}
            <TabsTrigger value="bio" className="gap-1.5"><User className="h-4 w-4" /> Bio</TabsTrigger>
            <TabsTrigger value="reply" className="gap-1.5"><MessageSquareReply className="h-4 w-4" /> Reply</TabsTrigger>
            {appMode === "business" && <TabsTrigger value="poster" className="gap-1.5"><Palette className="h-4 w-4" /> Poster</TabsTrigger>}
            {appMode === "business" && <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="h-4 w-4" /> Schedule</TabsTrigger>}
          </TabsList>

          <TabsContent value="generator">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">Generate your content</h3>
                <p className="mt-2 text-muted-foreground">{appMode === "personal" ? "Write captions and hashtags for your personal posts." : "Pick what you need and get post-ready copy instantly."}</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["3 caption variants per request","WhatsApp-ready product descriptions","Hook + body + CTA ad copy","Festival mode auto-detected","Brand voice auto-fills your details"].map((t) => (
                    <li key={t} className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" /><span className="text-foreground/80">{t}</span></li>
                  ))}
                </ul>
                {!canGenerate && (
                  <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <p className="font-medium text-destructive">Daily free limit reached</p>
                    <p className="mt-1 text-muted-foreground">You have used your {FREE_DAILY_LIMIT} free generations today.</p>
                    <Button type="button" size="sm" className="mt-3 gap-2" onClick={() => setPricingOpen(true)}>
                      <Crown className="h-4 w-4" /> Get more credits
                    </Button>
                  </div>
                )}
              </div>
              <div className="md:col-span-3">
                <GeneratorForm onGenerate={handleGenerate} loading={loading} brandVoice={brandVoice} mode={appMode} />
              </div>
            </div>
            {(loading || outputs.length > 0) && (
              <div id="results" className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold">{heading}</h3>
                    <p className="mt-1 text-muted-foreground">Tap copy and paste straight into your post.</p>
                  </div>
                  {outputs.length > 0 && !loading && (
                    <Button type="button" variant="outline" onClick={handleRegenerate} disabled={loading}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                    </Button>
                  )}
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {loading && [0,1,2].map((i) => (
                    <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-gradient-to-r from-muted via-card to-muted bg-[length:200%_100%] animate-shimmer" />
                  ))}
                  {!loading && outputs.map((o, i) => (
                    <OutputCard key={i} index={outputs.length > 1 ? i : undefined} text={o.text} label={o.label}
                      platform={lastInput?.platform} contentType={lastType} businessName={lastInput?.businessName} language={lastInput?.language}
                      onRefine={lastType !== "hashtag" ? (mode) => handleRefine(i, mode) : undefined}
                      refining={refiningIdx?.idx === i ? refiningIdx.mode : null}
                      onDownloadPoster={() => { setActiveTool("poster"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="image">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">Photo Caption</h3>
                <p className="mt-2 text-muted-foreground">{appMode === "personal" ? "Upload any photo — selfie, travel, food, anything — and AI writes captions for it." : "Upload a product photo and AI writes promotional captions for it."}</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["Works for any photo — personal, travel, food, product", "Drag & drop or click to upload", "JPG, PNG, WEBP up to 4 MB", "3 caption variants", "Add extra context for better results"].map((t) => (
                    <li key={t} className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" /><span className="text-foreground/80">{t}</span></li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-3">
                <ImageCaptionTool defaultBusinessName={brandVoice?.businessName} defaultTone={brandVoice?.tone} defaultLanguage={brandVoice?.language} mode={appMode} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">WhatsApp Broadcast</h3>
                <p className="mt-2 text-muted-foreground">Ready-to-send templates for greetings, order confirmations, and festive offers.</p>
              </div>
              <div className="md:col-span-3">
                <WhatsAppTemplates defaultBusinessName={brandVoice?.businessName} defaultLanguage={brandVoice?.language} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bio">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">Bio Generator</h3>
                <p className="mt-2 text-muted-foreground">{appMode === "personal" ? "Personal Instagram and LinkedIn bios that show who you really are." : "Instagram and LinkedIn bios that capture your brand in a few lines."}</p>
              </div>
              <div className="md:col-span-3">
                <BioGenerator defaultBusinessName={brandVoice?.businessName} defaultTone={brandVoice?.tone} mode={appMode} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reply">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">Reply Generator</h3>
                <p className="mt-2 text-muted-foreground">{appMode === "personal" ? "Paste any DM or comment — get 3 natural reply options for your personal account." : "Paste any customer DM or comment and get 3 polite reply options."}</p>
              </div>
              <div className="md:col-span-3">
                <ReplyGenerator defaultBusinessName={brandVoice?.businessName} defaultLanguage={brandVoice?.language} mode={appMode} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="poster">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">Poster Generator</h3>
                <p className="mt-2 text-muted-foreground">Combine your caption and product photo into a shareable 1080x1080 JPG poster.</p>
              </div>
              <div className="md:col-span-3">
                <PosterGenerator defaultCaption={outputs[0]?.text} defaultBusinessName={brandVoice?.businessName} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <h3 className="font-display text-xl font-bold">Scheduled Posting</h3>
                <p className="mt-2 text-muted-foreground">Schedule posts to Instagram and Facebook via Meta Graph API.</p>
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>Setup required:</strong> Add VITE_META_APP_ID to your .env and configure Stripe keys in Supabase secrets.
                </div>
              </div>
              <div className="md:col-span-3">
                <ScheduledPosting defaultCaption={outputs[0]?.text} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} WriteRight. Made for Indian businesses.</p>
          <p className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Powered by AI</p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} onSignInRequired={() => setAuthOpen(true)} onUnlocked={fetchUsage} />
    </div>
  );
};

export default Index;










