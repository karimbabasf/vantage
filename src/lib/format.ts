// Small, dependency-light formatting helpers. 24h clock by default (board style).

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function fmtTime(iso: string, clock24 = true): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  if (clock24) return `${pad2(h)}:${pad2(m)}`;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ampm}`;
}

export function fmtClock(d: Date, seconds = false): string {
  const base = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return seconds ? `${base}:${pad2(d.getSeconds())}` : base;
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function fmtDayLabel(d: Date): string {
  return `${DOW[d.getDay()]} ${pad2(d.getDate())} ${MON[d.getMonth()]}`;
}

export function minutesUntil(iso: string, now = Date.now()): number {
  return Math.round((Date.parse(iso) - now) / 60000);
}

export function fmtRelative(iso: string, now = Date.now()): string {
  const mins = Math.round((Date.parse(iso) - now) / 60000);
  const a = Math.abs(mins);
  let unit: string;
  if (a < 1) return "now";
  if (a < 60) unit = `${a}m`;
  else if (a < 1440) unit = `${Math.round(a / 60)}h`;
  else unit = `${Math.round(a / 1440)}d`;
  return mins >= 0 ? `in ${unit}` : `${unit} ago`;
}

export function fmtDelta(n: number): string {
  if (n === 0) return "0";
  return (n > 0 ? "+" : "") + fmtCount(n);
}

export function fmtCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtCompact(n: number): string {
  const a = Math.abs(n);
  if (a < 1000) return String(n);
  if (a < 1_000_000) return (n / 1000).toFixed(a < 10_000 ? 1 : 0).replace(/\.0$/, "") + "K";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000));
}

export function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
