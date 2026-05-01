import { useState } from "react";
import { MessageCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OutputCard } from "@/components/OutputCard";
import { toast } from "sonner";
import { useGenerate } from "@/hooks/useGenerate";
import { ALL_FESTIVALS } from "@/lib/festivalDetector";

type TemplateType = "greeting" | "order" | "offer";
const languages = ["English", "Hinglish", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali"];

interface Props { defaultBusinessName?: string; defaultLanguage?: string; }

export const WhatsAppTemplates = ({ defaultBusinessName = "", defaultLanguage = "English" }: Props) => {
  const { generate, loading } = useGenerate();
  const [templateType, setTemplateType] = useState<TemplateType>("greeting");
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [language, setLanguage] = useState(defaultLanguage);
  const [festival, setFestival] = useState("Diwali");
  const [customerName, setCustomerName] = useState("");
  const [orderDetails, setOrderDetails] = useState("");
  const [offerDetails, setOfferDetails] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!businessName.trim()) { toast.error("Please enter your business name"); return; }
    const desc = templateType === "order"
      ? `Customer: ${customerName || "Customer"}. Order: ${orderDetails || "their recent order"}.`
      : templateType === "offer" ? offerDetails || "special discount"
      : `Festival greeting for ${festival}`;
    try {
      const results = await generate({ type: "whatsapp_template", templateType, businessName, description: desc, language, festival: templateType !== "order" ? festival : "" });
      setOutputs(results);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10"><MessageCircle className="h-5 w-5 text-green-600" /></span>
        <div><h3 className="font-display text-lg font-bold">WhatsApp Broadcast Templates</h3><p className="text-sm text-muted-foreground">Greetings, order confirmations & festive offers</p></div>
      </div>
      <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as TemplateType)}>
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="greeting">Greeting</TabsTrigger>
          <TabsTrigger value="order">Order</TabsTrigger>
          <TabsTrigger value="offer">Offer</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-5 grid gap-4">
        <div className="grid gap-2"><Label>Business name</Label><Input placeholder="e.g. Anaya Boutique" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
        {templateType === "greeting" && (
          <div className="grid gap-2"><Label>Festival</Label>
            <Select value={festival} onValueChange={setFestival}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_FESTIVALS.filter((f) => f !== "None").map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {templateType === "order" && (<>
          <div className="grid gap-2"><Label>Customer name (optional)</Label><Input placeholder="e.g. Priya" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Order details</Label><Textarea placeholder="e.g. 2x Handloom Saree, Order #1042, delivery in 3-5 days" value={orderDetails} onChange={(e) => setOrderDetails(e.target.value)} rows={2} /></div>
        </>)}
        {templateType === "offer" && (<>
          <div className="grid gap-2"><Label>Offer details</Label><Textarea placeholder="e.g. 30% off on all sarees, valid till Sunday, use code DIWALI30" value={offerDetails} onChange={(e) => setOfferDetails(e.target.value)} rows={2} /></div>
          <div className="grid gap-2"><Label>Festival</Label>
            <Select value={festival} onValueChange={setFestival}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_FESTIVALS.filter((f) => f !== "None").map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>)}
        <div className="grid gap-2"><Label>Language</Label>
          <Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="button" variant="hero" size="lg" disabled={loading} onClick={handleGenerate} className="mt-1">
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-5 w-5" /> Generate templates</>}
        </Button>
      </div>
      {outputs.length > 0 && (
        <div className="mt-6 grid gap-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp templates</h4>
          {outputs.map((text, i) => <OutputCard key={i} index={outputs.length > 1 ? i : undefined} text={text} platform="WhatsApp" />)}
        </div>
      )}
    </div>
  );
};
