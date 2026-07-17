import type { CalendarEvent } from "@/lib/types";
import { clamp } from "@/lib/format";

export interface DayWindow {
  startHour: number;
  endHour: number;
  pxPerHour: number;
}

export interface Placed {
  ev: CalendarEvent;
  top: number;
  height: number;
  col: number;
  cols: number;
}

export function computeWindow(events: CalendarEvent[], pxPerHour = 54): DayWindow {
  let minH = 8;
  let maxH = 21;
  for (const e of events) {
    if (e.allDay) continue;
    const s = new Date(e.start);
    const en = new Date(e.end);
    minH = Math.min(minH, s.getHours());
    maxH = Math.max(maxH, en.getHours() + (en.getMinutes() > 0 ? 1 : 0));
  }
  return {
    startHour: clamp(Math.min(minH, 8), 0, 23),
    endHour: clamp(Math.max(maxH, 21), 1, 24),
    pxPerHour,
  };
}

export function totalHeight(win: DayWindow): number {
  return (win.endHour - win.startHour) * win.pxPerHour;
}

export function yFor(iso: string | number, win: DayWindow): number {
  const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
  const mins = (d.getHours() - win.startHour) * 60 + d.getMinutes();
  return clamp((mins / 60) * win.pxPerHour, 0, totalHeight(win));
}

// Greedy lane packing so overlapping events sit side by side.
export function layout(events: CalendarEvent[], win: DayWindow): Placed[] {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const placed: Placed[] = [];
  let cluster: CalendarEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    const assign = new Map<string, number>();
    for (const e of cluster) {
      const s = Date.parse(e.start);
      let col = colEnds.findIndex((end) => end <= s);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(0);
      }
      colEnds[col] = Date.parse(e.end);
      assign.set(e.id, col);
    }
    const cols = colEnds.length;
    for (const e of cluster) {
      const top = yFor(e.start, win);
      const height = Math.max(yFor(e.end, win) - top, 30);
      placed.push({ ev: e, top, height, col: assign.get(e.id) ?? 0, cols });
    }
    cluster = [];
  };

  for (const e of timed) {
    const s = Date.parse(e.start);
    if (cluster.length && s < clusterEnd) {
      cluster.push(e);
      clusterEnd = Math.max(clusterEnd, Date.parse(e.end));
    } else {
      flush();
      cluster = [e];
      clusterEnd = Date.parse(e.end);
    }
  }
  flush();
  return placed;
}

export function nextEventId(events: CalendarEvent[], now: number): string | null {
  const upcoming = events
    .filter((e) => !e.allDay && Date.parse(e.start) > now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return upcoming[0]?.id ?? null;
}
