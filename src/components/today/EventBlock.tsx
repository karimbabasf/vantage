import type { Placed } from "./dayLayout";
import { cn } from "@/components/ui";
import { durationMinutes, fmtDuration, fmtRelative, fmtTime } from "@/lib/format";

interface Props {
  p: Placed;
  now: number;
  clock24: boolean;
  isNext: boolean;
}

export function EventBlock({ p, now, clock24, isNext }: Props) {
  const { ev, top, height, col, cols } = p;
  const start = Date.parse(ev.start);
  const end = Date.parse(ev.end);
  const past = end < now;
  const ongoing = start <= now && now <= end;
  const upcoming = start > now;
  const compact = height < 46;

  const widthPct = 100 / cols;
  const leftPct = col * widthPct;

  return (
    <div
      className={cn("absolute", past && "opacity-45")}
      style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
    >
      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-[5px] border py-1.5 pl-3 pr-2 transition-colors duration-150",
          ongoing && "border-signal/55 bg-tile",
          isNext && !ongoing && "border-signal/60 bg-tile",
          !ongoing && !isNext && "border-edge/60 bg-tile/75 hover:border-edge",
        )}
        style={{ boxShadow: "var(--shadow-tile)" }}
      >
        <span
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: ongoing || isNext ? "var(--color-signal)" : ev.calendarColorHex }}
        />

        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate font-medium text-ink", compact ? "text-[12px]" : "text-[13.5px]")}>
            {ev.title}
          </span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-mute">{fmtTime(ev.start, clock24)}</span>
        </div>

        {!compact && (
          <div className="mt-auto flex items-center gap-2 pt-1 text-[11px] text-ink-mute">
            <span className="font-mono tabular-nums">{fmtDuration(durationMinutes(ev.start, ev.end))}</span>
            {ev.location && <span className="truncate">/ {ev.location}</span>}
            <span className="ml-auto">
              {ongoing ? (
                <span className="caps text-[9px] text-signal">On now</span>
              ) : isNext ? (
                <span className="caps text-[9px] text-signal">Next / {fmtRelative(ev.start, now)}</span>
              ) : upcoming ? (
                <span className="font-mono text-[10px] text-ink-faint">{fmtRelative(ev.start, now)}</span>
              ) : null}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
