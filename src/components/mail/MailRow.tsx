import { Check, ExternalLink, Flag } from "lucide-react";
import type { MailItem } from "@/lib/types";
import { useStore } from "@/lib/store";
import { IconButton, cn } from "@/components/ui";
import { fmtRelative } from "@/lib/format";

const RAIL: Record<MailItem["bucket"], string> = {
  attention: "bg-signal",
  fyi: "bg-ink-mute/70",
  noise: "bg-edge",
};

export function MailRow({ m }: { m: MailItem }) {
  const run = useStore((s) => s.runMailAction);
  const now = useStore((s) => s.now);
  const attention = m.bucket === "attention";

  return (
    <div className="group relative flex gap-2.5 border-b border-seam/50 px-3 py-2.5 transition-colors hover:bg-tile/40">
      <span className={cn("mt-0.5 w-[3px] shrink-0 self-stretch rounded-full", RAIL[m.bucket], !m.unread && "opacity-40")} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("truncate text-[13px]", m.unread ? "font-semibold text-ink" : "font-medium text-ink-dim")}>
            {m.senderName}
          </span>
          {m.flagged && <Flag size={11} className="shrink-0 fill-signal text-signal" />}
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-ink-faint">
            {fmtRelative(m.date, now)}
          </span>
        </div>

        <div className={cn("truncate text-[13px]", m.unread ? "text-ink" : "text-ink-dim")}>{m.subject}</div>
        <div className="truncate text-[11.5px] text-ink-mute">{m.snippet}</div>

        <div className="mt-1 flex items-center gap-2">
          <span className={cn("caps text-[9px]", attention ? "text-signal" : "text-ink-faint")}>{m.aiReason ?? m.reason}</span>
          <span className="ml-auto font-mono text-[9px] tabular-nums text-ink-faint/70 opacity-0 group-hover:opacity-100">
            {m.score}
          </span>
        </div>
      </div>

      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <IconButton
          label={m.flagged ? "Unflag" : "Flag"}
          active={m.flagged}
          onClick={() => run(m.id, m.flagged ? "unflag" : "flag")}
        >
          <Flag size={13} strokeWidth={1.75} />
        </IconButton>
        {m.unread && (
          <IconButton label="Mark read" onClick={() => run(m.id, "read")}>
            <Check size={14} strokeWidth={1.75} />
          </IconButton>
        )}
        <IconButton label="Open in Mail" onClick={() => run(m.id, "open")}>
          <ExternalLink size={13} strokeWidth={1.75} />
        </IconButton>
      </div>
    </div>
  );
}
