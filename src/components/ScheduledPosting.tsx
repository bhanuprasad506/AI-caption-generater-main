import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, Instagram, Facebook, Plus, Trash2, ExternalLink, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type ScheduledPost = Tables<"scheduled_posts">;

// Meta OAuth — replace with your Meta App ID
const META_APP_ID = import.meta.env.VITE_META_APP_ID ?? "YOUR_META_APP_ID";
const META_REDIRECT_URI = `${window.location.origin}/meta-callback`;
const META_SCOPE = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";

function metaOAuthUrl() {
  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${META_SCOPE}&response_type=code`;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  published: "bg-green-500/10 text-green-700 border-green-200",
  failed: "bg-red-500/10 text-red-700 border-red-200",
};

interface Props {
  defaultCaption?: string;
}

export const ScheduledPosting = ({ defaultCaption = "" }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);

  // New post form
  const [caption, setCaption] = useState(defaultCaption);
  const [platform, setPlatform] = useState("instagram");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });
    setPosts((data as ScheduledPost[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPosts();
    // Check if Meta token exists in localStorage
    setMetaConnected(!!localStorage.getItem("writeright.meta_token"));
  }, [fetchPosts]);

  const connectMeta = () => {
    window.location.href = metaOAuthUrl();
  };

  const schedulePost = async () => {
    if (!user) { toast.error("Sign in to schedule posts"); return; }
    if (!caption.trim()) { toast.error("Caption is required"); return; }
    if (!scheduledDate) { toast.error("Please pick a date"); return; }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (scheduledAt <= new Date()) { toast.error("Scheduled time must be in the future"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("scheduled_posts").insert({
        user_id: user.id,
        platform,
        caption,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
      });
      if (error) throw error;
      toast.success("Post scheduled!");
      setNewPostOpen(false);
      setCaption("");
      setScheduledDate("");
      fetchPosts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to schedule post");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (id: string) => {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Post removed");
  };

  const publishNow = async (post: ScheduledPost) => {
    const token = localStorage.getItem("writeright.meta_token");
    if (!token) {
      toast.error("Connect your Instagram/Facebook account first");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("publish-post", {
        body: { postId: post.id, caption: post.caption, platform: post.platform, metaToken: token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Published successfully!");
      fetchPosts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    }
  };

  const formatScheduled = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft md:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <Calendar className="h-5 w-5 text-blue-600" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold">Scheduled Posting</h3>
            <p className="text-sm text-muted-foreground">
              Schedule posts to Instagram &amp; Facebook via Meta Graph API
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setNewPostOpen(true)}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Schedule post
        </Button>
      </div>

      {/* Meta connection banner */}
      <div className={`mb-5 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
        metaConnected
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-orange-200 bg-orange-50 text-orange-800"
      }`}>
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0" />
          {metaConnected
            ? "Instagram & Facebook connected"
            : "Connect your Instagram/Facebook to enable publishing"}
        </div>
        {!metaConnected && (
          <Button type="button" size="sm" variant="outline" onClick={connectMeta} className="gap-2 shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> Connect Meta
          </Button>
        )}
      </div>

      {/* Posts list */}
      {!user ? (
        <p className="text-center text-sm text-muted-foreground py-8">Sign in to schedule posts.</p>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          <Calendar className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p>No scheduled posts yet.</p>
          <p className="mt-1">Click "Schedule post" to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {post.platform === "instagram" ? (
                    <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
                  ) : (
                    <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
                  )}
                  <span className="text-xs font-semibold capitalize text-muted-foreground">
                    {post.platform}
                  </span>
                </div>
                <Badge className={`text-[10px] border ${statusColors[post.status]}`}>
                  {post.status}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm">{post.caption}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatScheduled(post.scheduled_at)}
              </div>
              <div className="mt-3 flex gap-2">
                {post.status === "pending" && metaConnected && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => publishNow(post)}
                  >
                    Publish now
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => deletePost(post.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* New post dialog */}
      <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a post</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">
                    <span className="flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-500" /> Instagram</span>
                  </SelectItem>
                  <SelectItem value="facebook">
                    <span className="flex items-center gap-2"><Facebook className="h-4 w-4 text-blue-600" /> Facebook</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-caption">Caption *</Label>
              <Textarea
                id="sched-caption"
                placeholder="Your post caption…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="sched-date">Date *</Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={scheduledDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sched-time">Time</Label>
                <Input
                  id="sched-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setNewPostOpen(false)}>Cancel</Button>
            <Button type="button" onClick={schedulePost} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Calendar className="h-4 w-4" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
