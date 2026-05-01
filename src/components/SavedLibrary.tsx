import { useCallback, useEffect, useState } from "react";
import { BookOpen, Trash2, FolderPlus, Folder, Copy, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type SavedOutput = Tables<"saved_outputs">;

interface Props {
  savedCount: number;
  onSavedCountChange: (n: number) => void;
}

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const SavedLibrary = ({ savedCount, onSavedCountChange }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [outputs, setOutputs] = useState<SavedOutput[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: camps }, { data: outs }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("saved_outputs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setCampaigns((camps as Campaign[]) ?? []);
    const allOutputs = (outs as SavedOutput[]) ?? [];
    setOutputs(allOutputs);
    onSavedCountChange(allOutputs.length);
    setLoading(false);
  }, [user, onSavedCountChange]);

  useEffect(() => {
    if (open && user) fetchData();
  }, [open, user, fetchData]);

  const createCampaign = async () => {
    if (!user || !newCampaignName.trim()) return;
    const { error } = await supabase.from("campaigns").insert({
      user_id: user.id,
      name: newCampaignName.trim(),
    });
    if (error) { toast.error("Failed to create campaign"); return; }
    toast.success("Campaign created");
    setNewCampaignName("");
    setNewCampaignOpen(false);
    fetchData();
  };

  const deleteOutput = async (id: string) => {
    await supabase.from("saved_outputs").delete().eq("id", id);
    setOutputs((prev) => prev.filter((o) => o.id !== id));
    onSavedCountChange(outputs.length - 1);
    toast.success("Removed from library");
  };

  const moveToCampaign = async (outputId: string, campaignId: string) => {
    await supabase
      .from("saved_outputs")
      .update({ campaign_id: campaignId === "none" ? null : campaignId })
      .eq("id", outputId);
    fetchData();
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success("Copied!");
  };

  const filtered = selectedCampaign === "all"
    ? outputs
    : selectedCampaign === "uncategorized"
    ? outputs.filter((o) => !o.campaign_id)
    : outputs.filter((o) => o.campaign_id === selectedCampaign);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Library
            {savedCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {savedCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Saved Library
            </SheetTitle>
            <SheetDescription>Your saved outputs, organized by campaign.</SheetDescription>
          </SheetHeader>

          {!user ? (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Sign in to save and organize your content.
            </div>
          ) : (
            <>
              {/* Campaign filter + create */}
              <div className="mt-4 flex items-center gap-2">
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outputs ({outputs.length})</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-1.5">
                          <Folder className="h-3.5 w-3.5" /> {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setNewCampaignOpen(true)}
                  title="New campaign"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Outputs list */}
              <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
                {loading && (
                  <p className="text-center text-sm text-muted-foreground">Loading…</p>
                )}
                {!loading && filtered.length === 0 && (
                  <p className="mt-8 text-center text-sm text-muted-foreground">
                    Nothing saved here yet. Hit the ★ button on any output to save it.
                  </p>
                )}
                {filtered.map((o) => (
                  <article
                    key={o.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <header className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {o.content_type}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
                    </header>
                    {o.business_name && (
                      <p className="mt-1 truncate text-sm font-medium">{o.business_name}</p>
                    )}
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{o.text}</p>

                    {/* Campaign assignment */}
                    <div className="mt-2">
                      <Select
                        value={o.campaign_id ?? "none"}
                        onValueChange={(v) => moveToCampaign(o.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Move to campaign…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No campaign</SelectItem>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 flex-1 text-xs"
                        onClick={() => copyText(o.id, o.text)}
                      >
                        {copiedId === o.id ? (
                          <><Check className="mr-1 h-3.5 w-3.5 text-accent" /> Copied</>
                        ) : (
                          <><Copy className="mr-1 h-3.5 w-3.5" /> Copy</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteOutput(o.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New campaign dialog */}
      <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="camp-name">Campaign name</Label>
            <Input
              id="camp-name"
              placeholder="e.g. Diwali 2025"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCampaign()}
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={createCampaign} disabled={!newCampaignName.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Standalone save function — call from OutputCard
export async function saveOutput(
  userId: string,
  params: {
    content_type: string;
    text: string;
    label?: string;
    platform?: string;
    language?: string;
    business_name?: string;
  }
): Promise<boolean> {
  const { error } = await supabase.from("saved_outputs").insert({
    user_id: userId,
    ...params,
  });
  return !error;
}
