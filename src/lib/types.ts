// ============================================================
// Vantage data contracts. These are the interface between the
// React UI and the Rust backend (the /api routes return these shapes).
// ============================================================

// ---------- Calendar ----------
export type EventStatus = "confirmed" | "tentative" | "canceled" | "none";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO8601
  end: string; // ISO8601
  allDay: boolean;
  calendarTitle: string;
  calendarColorHex: string; // "#RRGGBB"
  location: string | null;
  isRecurring: boolean;
  status: EventStatus;
  attendees?: string[]; // email addresses, when known
}

// ---------- Mail ----------
export type MailBucket = "attention" | "fyi" | "noise";

// Raw shape returned by the mail backend (AppleScript bridge).
export interface RawMail {
  id: string;
  account: string;
  mailbox: string;
  senderName: string;
  senderAddress: string;
  subject: string;
  snippet: string;
  date: string; // ISO8601
  unread: boolean;
  flagged: boolean;
  toMe: boolean; // one of my addresses is a direct recipient
  bulk: boolean; // looks like a list / newsletter / no-reply
}

// Raw mail plus computed triage.
export interface MailItem extends RawMail {
  score: number; // 0..100
  bucket: MailBucket;
  reason: string; // one-line human explanation
  reasonTags: string[];
  aiReason?: string; // present when Claude triage ran
}

// ---------- Instagram ----------
export interface IgProfile {
  username: string;
  name: string;
  avatarUrl: string | null;
  followers: number;
  following: number | null;
  mediaCount: number;
}

export interface IgDelta {
  d24h: number;
  d7d: number;
}

export interface IgSeriesPoint {
  t: string; // ISO date (day)
  followers: number;
}

export interface IgMedia {
  id: string;
  caption: string;
  mediaType: string; // IMAGE | VIDEO | CAROUSEL_ALBUM | REELS
  permalink: string;
  thumbnailUrl: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  saved: number | null;
  reach: number | null;
}

export interface IgStats {
  connected: boolean;
  profile: IgProfile | null;
  followerDelta: IgDelta | null;
  series: IgSeriesPoint[]; // recent daily snapshots (for sparkline)
  reach24h: number | null;
  reach7d: number | null;
  likes7d: number | null;
  comments7d: number | null;
  media: IgMedia[];
  lastUpdated: string | null;
}

// ---------- System / settings ----------
export type Grant = "granted" | "denied" | "unknown";

export interface PermissionStatus {
  calendar: Grant;
  mail: Grant;
}

export interface Settings {
  igConnected: boolean;
  anthropicKeySet: boolean;
  aiTriage: boolean;
  ambient: boolean;
  refreshSeconds: number;
  clock24h: boolean;
  myAddresses: string[];
  myFirstName: string;
  vips: string[]; // addresses or @domains treated as important
}

// Personal fields start empty and are filled in from Settings, which persists them to
// this browser. Do not hardcode addresses here: it puts your mail identity in the repo,
// and triage silently demotes any account whose address is missing from myAddresses.
export const DEFAULT_SETTINGS: Settings = {
  igConnected: false,
  anthropicKeySet: false,
  aiTriage: false,
  ambient: true,
  refreshSeconds: 60,
  clock24h: true,
  myAddresses: [],
  myFirstName: "",
  vips: [],
};
