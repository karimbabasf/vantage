import { Heart, MessageCircle } from "lucide-react";
import type { IgMedia } from "@/lib/types";
import { fmtCompact } from "@/lib/format";

function typeShort(t: string): string {
  if (/REEL|VIDEO/i.test(t)) return "REEL";
  if (/CAROUSEL/i.test(t)) return "SET";
  return "IMG";
}

export function PostCard({ m }: { m: IgMedia }) {
  return (
    <a
      href={m.permalink}
      target="_blank"
      rel="noreferrer"
      className="flex gap-2.5 border-b border-seam/50 py-2 transition-colors hover:bg-tile/30"
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[4px] border border-edge/50 bg-tile">
        {m.thumbnailUrl ? (
          <img src={m.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center font-mono text-[9px] tracking-wider text-ink-faint">
            {typeShort(m.mediaType)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[11.5px] leading-snug text-ink-dim">{m.caption || "Untitled"}</div>
        <div className="mt-1 flex items-center gap-3 font-mono text-[10px] tabular-nums text-ink-mute">
          <span className="inline-flex items-center gap-1">
            <Heart size={10} strokeWidth={2} className="text-signal/80" />
            {fmtCompact(m.likes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={10} strokeWidth={2} />
            {fmtCompact(m.comments)}
          </span>
        </div>
      </div>
    </a>
  );
}
