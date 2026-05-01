import { useState } from "react";
import { MessageSquareReply, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OutputCard } from "@/components/OutputCard";
import { toast } from "sonner";
import { useGenerate } from "@/hooks/useGenerate";

const languages = ["English", "Hinglish", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali"];

const businessTypes = { complaint: "Complaint", inquiry: "Inquiry", compliment: "Compliment", order: "Order query", general: "General DM" };
const personalTypes = { rude_comment: "Rude comment", compliment: "Compliment", question: "Question about me", collab: "Collab / promo request", general: "General DM" };

interface Props {
  defaultBusinessName?: string;
  defaultLanguage?: string;
  mode?: "personal" | "business";
}

export const ReplyGenerator = ({ defaultBusinessName = "", defaultLanguage = "English", mode = "business" }: Props) => {
  const isPersonal = mode === "personal";
  const { generate, loading } = useGenerate();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [language, setLanguage] = useState(defaultLanguage);
  const [outputs, setOutputs] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!message.trim()) { toast.error("Please paste the message first"); return; }
    try {
      const results = await generate({
        type: "reply",
        mode,
        messageType,
        businessName: isPersonal ? "me" : (defaultBusinessName || "our business"),
        description: message,
        language,
      });
      setOutputs(results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const messageLabels = isPersonal ? personalTypes : businessTypes;

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
          <MessageSquareReply className="h-5 w-5 text-blue-600" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">Reply Generator</h3>
          <p className="text-sm text-muted-foreground">
            {isPersonal ? "Paste any DM or comment — get 3 natural reply options" : "Paste a customer DM or comment — get 3 polite reply options"}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="reply-msg">{isPersonal ? "Message or comment *" : "Customer message / comment *"}</Label>
          <Textarea
            id="reply-msg"
            placeholder={isPersonal
              ? `Paste the DM or comment here...\n\ne.g. "Your photos are amazing! How do you edit them?"`
              : `Paste the DM or comment here...\n\ne.g. "Hi, I ordered 3 days ago but haven't received any update. When will it be delivered?"`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Message type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(messageLabels).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Reply language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <Button type="button" variant="hero" size="lg" disabled={loading} onClick={handleGenerate} className="mt-1">
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Writing replies...</> : <><Sparkles className="mr-2 h-5 w-5" /> Generate 3 reply options</>}
        </Button>
      </div>

      {outputs.length > 0 && (
        <div className="mt-6 grid gap-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reply options</h4>
          {outputs.map((text, i) => (
            <OutputCard key={i} index={outputs.length > 1 ? i : undefined} text={text} contentType="reply" />
          ))}
        </div>
      )}
    </div>
  );
};
