import { History, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ContentType } from "@/components/GeneratorForm";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  type: ContentType;
  businessName: string;
  description: string;
  platform: string;
  language: string;
  preview: string;
  outputs: { text: string; label?: string }[];
}

interface Props {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}

const typeLabel: Record<ContentType, string> = {
  caption: "Captions",
  product: "Product",
  ad: "Ad copy",
  hashtag: "Hashtags",
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const HistoryPanel = ({ entries, onRestore, onClear }: Props) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          History
          {entries.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {entries.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Recent generations</SheetTitle>
          <SheetDescription>
            Your last {entries.length} generations are saved on this device.
          </SheetDescription>
        </SheetHeader>

        {entries.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No history yet. Generate something to see it here.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {entries.map((e) => (
              <article
                key={e.id}
                className="rounded-lg border border-border bg-card p-4 transition-smooth hover:shadow-soft"
              >
                <header className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    {typeLabel[e.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</span>
                </header>
                <h3 className="mt-2 truncate text-sm font-semibold">{e.businessName}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.preview}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">{e.platform}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{e.language}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-3 h-8 w-full justify-start text-xs"
                  onClick={() => onRestore(e)}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  View results
                </Button>
              </article>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="mt-2 w-full text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear history
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
