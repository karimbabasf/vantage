import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { useStore } from "@/lib/store";
import { Panel, Segmented } from "@/components/ui";
import { MailRow } from "./MailRow";
import type { MailBucket, MailItem } from "@/lib/types";

type Mode = "focus" | "all";

const SECTIONS: { bucket: MailBucket; label: string }[] = [
  { bucket: "attention", label: "Needs attention" },
  { bucket: "fyi", label: "For your awareness" },
  { bucket: "noise", label: "Low priority" },
];

export function MailTrack() {
  const mail = useStore((s) => s.mail);
  const loading = useStore((s) => s.loading.mail);
  const error = useStore((s) => s.error.mail);
  const mailPerm = useStore((s) => s.perms.mail);
  const [mode, setMode] = useState<Mode>("focus");

  const groups = useMemo(() => {
    const g: Record<MailBucket, MailItem[]> = { attention: [], fyi: [], noise: [] };
    for (const m of mail) g[m.bucket].push(m);
    return g;
  }, [mail]);

  const sections = SECTIONS.filter((s) => (mode === "all" ? true : s.bucket !== "noise"));

  return (
    <Panel
      title="Needs You"
      bodyClassName="flex flex-col"
      right={
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-ink-mute">{groups.attention.length} flagged</span>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "focus", label: "Focus" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
      }
    >
      {loading && mail.length === 0 ? (
        <Skeleton />
      ) : mailPerm === "denied" ? (
        <StateMsg icon title="Mail access needed" hint="Allow Vantage to control Mail when prompted, or enable it in Settings." />
      ) : error ? (
        <StateMsg title="Could not read mail" hint={error} />
      ) : mail.length === 0 ? (
        <StateMsg icon title="Inbox is quiet" hint="Nothing is waiting on you right now." />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sections.map((sec) => {
            const items = groups[sec.bucket];
            if (items.length === 0) return null;
            return (
              <div key={sec.bucket}>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-seam/60 bg-panel/95 px-3 py-1.5 backdrop-blur-sm">
                  <span className="caps text-[9px]">{sec.label}</span>
                  <span className="font-mono text-[10px] tabular-nums text-ink-faint">{items.length}</span>
                </div>
                {items.map((m) => (
                  <MailRow key={m.id} m={m} />
                ))}
              </div>
            );
          })}
          {mode === "focus" && groups.noise.length > 0 && (
            <button
              onClick={() => setMode("all")}
              className="w-full px-3 py-2.5 text-left font-mono text-[11px] text-ink-faint transition-colors hover:text-ink-mute"
            >
              + {groups.noise.length} low priority hidden
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

function StateMsg({ title, hint, icon }: { title: string; hint: string; icon?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      {icon && <Inbox size={22} strokeWidth={1.5} className="text-ink-faint" />}
      <span className="font-display text-[14px] font-semibold text-ink-dim">{title}</span>
      <span className="max-w-[34ch] text-[12px] leading-relaxed text-ink-mute">{hint}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 space-y-3 p-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-1/3 animate-pulse rounded bg-tile/50" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-tile/40" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-tile/30" />
        </div>
      ))}
    </div>
  );
}
