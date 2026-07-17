import { SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { FlapText } from "./SplitFlap";
import { IconButton, cn } from "@/components/ui";
import { fmtDayLabel, fmtDelta, pad2 } from "@/lib/format";

function Tally({ label, value, tone = "ink" }: { label: string; value: string; tone?: "ink" | "signal" | "pos" | "neg" }) {
  const toneClass = { ink: "text-ink", signal: "text-signal", pos: "text-pos", neg: "text-neg" }[tone];
  return (
    <div className="flex flex-col items-end leading-none">
      <span className="caps mb-1 text-[10px]">{label}</span>
      <span className={cn("font-mono text-[17px] tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}

export function BoardHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const now = useStore((s) => s.now);
  const events = useStore((s) => s.events);
  const mail = useStore((s) => s.mail);
  const ig = useStore((s) => s.ig);
  const clock24 = useStore((s) => s.settings.clock24h);

  const d = new Date(now);
  const hh = pad2(clock24 ? d.getHours() : d.getHours() % 12 || 12);
  const mm = pad2(d.getMinutes());

  const remaining = events.filter((e) => !e.allDay && Date.parse(e.start) > now).length;
  const attention = mail.filter((m) => m.bucket === "attention").length;
  const delta = ig?.followerDelta?.d24h ?? null;

  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 h-[68px] px-4">
      {/* brand */}
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0">
          <rect x="2" y="4" width="28" height="24" rx="4" fill="var(--color-tile)" />
          <rect x="2.5" y="4.5" width="27" height="23" rx="3.5" fill="none" stroke="var(--color-edge)" />
          <line x1="3" y1="16" x2="29" y2="16" stroke="var(--color-seam)" strokeWidth="1.4" />
          <rect x="6" y="9" width="15" height="3.4" rx="1" fill="var(--color-signal)" />
          <rect x="6" y="19.6" width="9" height="3.4" rx="1" fill="var(--color-ink-mute)" />
        </svg>
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.16em] text-ink">Vantage</span>
          <span className="caps mt-1 text-[9px] tracking-[0.24em]">Command Board</span>
        </div>
      </div>

      {/* clock */}
      <div className="flex items-end gap-3">
        <div className="flex items-center" style={{ fontSize: 30 }}>
          <FlapText value={hh} style={{ ["--flap-w" as string]: "0.64em", ["--flap-h" as string]: "1.18em" }} />
          <span className="clock-colon text-[26px] leading-none">:</span>
          <FlapText value={mm} style={{ ["--flap-w" as string]: "0.64em", ["--flap-h" as string]: "1.18em" }} />
        </div>
        <div className="flex flex-col pb-1 leading-tight">
          <span className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-ink-dim">
            {fmtDayLabel(d)}
          </span>
          <span className="font-mono text-[11px] text-ink-faint">{pad2(d.getSeconds())}s</span>
        </div>
      </div>

      {/* tallies + settings */}
      <div className="flex items-center justify-end gap-6">
        <Tally label="Ahead" value={String(remaining)} />
        <Tally label="Needs you" value={String(attention)} tone={attention > 0 ? "signal" : "ink"} />
        <Tally
          label="24h net"
          value={delta === null ? "--" : fmtDelta(delta)}
          tone={delta === null ? "ink" : delta >= 0 ? "pos" : "neg"}
        />
        <IconButton label="Settings" onClick={onOpenSettings} className="ml-1">
          <SlidersHorizontal size={16} strokeWidth={1.75} />
        </IconButton>
      </div>
    </header>
  );
}
