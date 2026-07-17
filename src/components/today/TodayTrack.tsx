import { useEffect, useMemo, useRef } from "react";
import { CalendarClock } from "lucide-react";
import { useStore } from "@/lib/store";
import { Panel } from "@/components/ui";
import { EventBlock } from "./EventBlock";
import { computeWindow, layout, nextEventId, totalHeight, yFor } from "./dayLayout";
import { fmtTime, pad2 } from "@/lib/format";

export function TodayTrack() {
  const events = useStore((s) => s.events);
  const now = useStore((s) => s.now);
  const clock24 = useStore((s) => s.settings.clock24h);
  const loading = useStore((s) => s.loading.events);
  const error = useStore((s) => s.error.events);
  const calPerm = useStore((s) => s.perms.calendar);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  const win = useMemo(() => computeWindow(events), [events]);
  const placed = useMemo(() => layout(events, win), [events, win]);
  const allDay = useMemo(() => events.filter((e) => e.allDay), [events]);

  const timedCount = events.length - allDay.length;
  const nextId = nextEventId(events, now);
  const H = totalHeight(win);
  const nowY = yFor(now, win);
  const nowHour = new Date(now).getHours();
  const nowVisible = nowHour >= win.startHour && nowHour < win.endHour;

  useEffect(() => {
    if (didScroll.current || loading || !scrollRef.current || placed.length === 0) return;
    didScroll.current = true;
    scrollRef.current.scrollTo({ top: Math.max(0, nowY - 170), behavior: "auto" });
  }, [loading, placed.length, nowY]);

  const hours: number[] = [];
  for (let h = win.startHour; h <= win.endHour; h++) hours.push(h);

  return (
    <Panel
      title="Today"
      bodyClassName="flex flex-col"
      right={
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-pos" style={{ boxShadow: "0 0 6px var(--color-pos)" }} />
          <span className="font-mono text-[11px] tabular-nums text-ink-mute">{timedCount} events</span>
        </div>
      }
    >
      {allDay.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-seam px-3 py-2">
          {allDay.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-edge/50 bg-tile/70 px-2 py-1 text-[11px] text-ink-dim"
            >
              <span className="h-2 w-2 rounded-[2px]" style={{ background: e.calendarColorHex }} />
              {e.title}
            </span>
          ))}
        </div>
      )}

      {loading && placed.length === 0 ? (
        <Skeleton />
      ) : calPerm === "denied" ? (
        <StateMsg icon title="Calendar access needed" hint="Open Settings and grant Vantage access to Calendars." />
      ) : error ? (
        <StateMsg title="Could not read calendar" hint={error} />
      ) : timedCount === 0 ? (
        <StateMsg icon title="Nothing scheduled" hint="A clear day. The board is quiet." />
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative mx-3 my-2.5" style={{ height: H }}>
            {hours.map((h) => {
              const y = (h - win.startHour) * win.pxPerHour;
              return (
                <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: y }}>
                  <span className="w-10 -translate-y-[6px] font-mono text-[10px] tabular-nums text-ink-faint">
                    {pad2(h)}:00
                  </span>
                  <span className="ml-1 h-px flex-1 bg-seam/60" />
                </div>
              );
            })}

            <div className="absolute left-12 right-0 top-0" style={{ height: H }}>
              {placed.map((p) => (
                <EventBlock key={p.ev.id} p={p} now={now} clock24={clock24} isNext={p.ev.id === nextId} />
              ))}
            </div>

            {nowVisible && (
              <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: nowY }}>
                <div className="flex items-center gap-1">
                  <span className="rounded-[3px] bg-signal px-1.5 py-[3px] font-mono text-[10px] font-bold leading-none tabular-nums text-on-signal">
                    {fmtTime(new Date(now).toISOString(), clock24)}
                  </span>
                  <span className="h-[1.5px] flex-1 bg-signal/85" />
                  <span className="h-1.5 w-1.5 -translate-x-1 rounded-full bg-signal" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function StateMsg({ title, hint, icon }: { title: string; hint: string; icon?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      {icon && <CalendarClock size={22} strokeWidth={1.5} className="text-ink-faint" />}
      <span className="font-display text-[14px] font-semibold text-ink-dim">{title}</span>
      <span className="max-w-[34ch] text-[12px] leading-relaxed text-ink-mute">{hint}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 space-y-2 p-3">
      {[64, 40, 52, 44, 72].map((h, i) => (
        <div key={i} className="animate-pulse rounded-[5px] border border-edge/40 bg-tile/40" style={{ height: h }} />
      ))}
    </div>
  );
}
