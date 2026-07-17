// Realistic mock data so the whole UI can be built and judged before the
// Rust backend exists. Anchored to the current clock so the now-line always
// lands among the day's events. The real provider replaces these 1:1.

import type { CalendarEvent, IgStats, RawMail } from "./types";

function at(h: number, m = 0): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function agoMin(mins: number): string {
  return new Date(Date.now() - mins * 60000).toISOString();
}
function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const WORK = "#c8a23a";
const PERSONAL = "#5aa06e";
const FOCUS = "#7c8fb0";

export function getMockEvents(): CalendarEvent[] {
  return [
    {
      id: "e-allday", title: "Ship Vantage v1", start: dayOffset(0), end: dayOffset(1),
      allDay: true, calendarTitle: "Deadlines", calendarColorHex: "#b0603a",
      location: null, isRecurring: false, status: "confirmed",
    },
    {
      id: "e1", title: "Morning standup", start: at(8, 0), end: at(8, 30), allDay: false,
      calendarTitle: "Warden", calendarColorHex: WORK, location: "Huddle", isRecurring: true,
      status: "confirmed", attendees: ["dana@warden.dev", "sam@warden.dev"],
    },
    {
      id: "e2", title: "1:1 with Dana", start: at(9, 30), end: at(10, 15), allDay: false,
      calendarTitle: "Warden", calendarColorHex: WORK, location: null, isRecurring: false,
      status: "confirmed", attendees: ["dana@warden.dev"],
    },
    {
      id: "e3", title: "Design review, board UI", start: at(11, 0), end: at(12, 0), allDay: false,
      calendarTitle: "Warden", calendarColorHex: WORK, location: "Figma", isRecurring: false,
      status: "confirmed", attendees: ["maya@stripe.com", "lee@figma.com"],
    },
    {
      id: "e4", title: "Lunch with Sofia", start: at(12, 30), end: at(13, 15), allDay: false,
      calendarTitle: "Personal", calendarColorHex: PERSONAL, location: "Tartine", isRecurring: false,
      status: "confirmed",
    },
    {
      id: "e5", title: "Focus: orchestration engine", start: at(14, 0), end: at(15, 30), allDay: false,
      calendarTitle: "Focus", calendarColorHex: FOCUS, location: null, isRecurring: false, status: "confirmed",
    },
    {
      id: "e6", title: "Investor call, Aria Capital", start: at(16, 0), end: at(16, 45), allDay: false,
      calendarTitle: "Warden", calendarColorHex: WORK, location: "Zoom", isRecurring: false,
      status: "confirmed", attendees: ["paul@ariacap.com"],
    },
    {
      id: "e7", title: "Gym", start: at(18, 30), end: at(19, 30), allDay: false,
      calendarTitle: "Personal", calendarColorHex: PERSONAL, location: null, isRecurring: true, status: "confirmed",
    },
  ];
}

export function getMockRawMail(): RawMail[] {
  return [
    {
      id: "m1", account: "Gmail", mailbox: "INBOX", senderName: "Paul Nassar", senderAddress: "paul@ariacap.com",
      subject: "Re: term sheet, a couple questions", snippet: "Alex, before our call, can you confirm the option pool and the board seat language? Two quick things.",
      date: agoMin(24), unread: true, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m2", account: "Gmail", mailbox: "INBOX", senderName: "Maya Chen", senderAddress: "maya@stripe.com",
      subject: "Deck for the design review?", snippet: "Do you have the latest board mock to walk through at 11? Want to prep comments.",
      date: agoMin(52), unread: true, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m3", account: "Gmail", mailbox: "INBOX", senderName: "Vercel Billing", senderAddress: "billing@vercel.com",
      subject: "Your invoice is past due", snippet: "Invoice #4821 for $214.00 is now past due. Please update your payment method to avoid interruption.",
      date: agoMin(140), unread: true, flagged: true, toMe: true, bulk: false,
    },
    {
      id: "m4", account: "Warden", mailbox: "INBOX", senderName: "Dana Okafor", senderAddress: "dana@warden.dev",
      subject: "standup notes + two blockers", snippet: "Wrote up what we hit. Blocked on the runner quota and the signing cert, need you for the second one.",
      date: agoMin(95), unread: true, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m5", account: "Gmail", mailbox: "INBOX", senderName: "TechCrunch", senderAddress: "erin@techcrunch.com",
      subject: "Quote for a story on AI agents?", snippet: "Working on a piece about multi-agent tools. Could you share a line on where this is heading? Deadline Thursday.",
      date: agoMin(180), unread: true, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m6", account: "Gmail", mailbox: "INBOX", senderName: "Sofia Rivera", senderAddress: "sofia.rivera@gmail.com",
      subject: "lunch still on?", snippet: "Tartine at 12:30 works? Grab a table if you get there first.",
      date: agoMin(210), unread: false, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m7", account: "Warden", mailbox: "INBOX", senderName: "Lee Park", senderAddress: "lee@figma.com",
      subject: "Re: components handoff", snippet: "Pushed the updated tokens and the split-flap component to the shared file. Notes inside.",
      date: agoMin(300), unread: false, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m8", account: "Gmail", mailbox: "Feed", senderName: "Stratechery", senderAddress: "newsletter@stratechery.com",
      subject: "The AI platform shift", snippet: "Today: what happens to distribution when the interface becomes an agent. Members only.",
      date: agoMin(160), unread: true, flagged: false, toMe: false, bulk: true,
    },
    {
      id: "m9", account: "Warden", mailbox: "Feed", senderName: "GitHub", senderAddress: "no-reply@github.com",
      subject: "[warden] CI passed on main", snippet: "Workflow Build and Test succeeded for commit a1f4c9.",
      date: agoMin(70), unread: true, flagged: false, toMe: false, bulk: true,
    },
    {
      id: "m10", account: "Gmail", mailbox: "Feed", senderName: "LinkedIn", senderAddress: "notifications@linkedin.com",
      subject: "You appeared in 9 searches this week", snippet: "See who is looking at your profile.",
      date: agoMin(420), unread: true, flagged: false, toMe: false, bulk: true,
    },
    {
      id: "m11", account: "Gmail", mailbox: "INBOX", senderName: "Rosa Delgado", senderAddress: "rosa.delgado@icloud.com",
      subject: "call me when you get a sec", snippet: "Nothing urgent, just checking in on the weekend plan.",
      date: agoMin(330), unread: true, flagged: false, toMe: true, bulk: false,
    },
    {
      id: "m12", account: "Gmail", mailbox: "Feed", senderName: "Amazon", senderAddress: "shipment-tracking@amazon.com",
      subject: "Your package will arrive today", snippet: "Track your order of USB-C cable (2-pack).",
      date: agoMin(500), unread: false, flagged: false, toMe: false, bulk: true,
    },
  ];
}

export function getMockIg(): IgStats {
  const series = [];
  let f = 13698;
  for (let i = 13; i >= 0; i--) {
    f += Math.round(20 + Math.random() * 70);
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    series.push({ t: d.toISOString(), followers: f });
  }
  const followers = f;

  const post = (id: string, cap: string, type: string, days: number, likes: number, comments: number, saved: number, reach: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return {
      id, caption: cap, mediaType: type, permalink: "https://instagram.com/p/" + id,
      thumbnailUrl: null, timestamp: d.toISOString(), likes, comments, saved, reach,
    };
  };

  return {
    connected: true,
    profile: {
      username: "alex.builds", name: "Alex", avatarUrl: null,
      followers, following: 512, mediaCount: 87,
    },
    followerDelta: { d24h: 128, d7d: 540 },
    series,
    reach24h: 8420,
    reach7d: 41180,
    likes7d: 3182,
    comments7d: 214,
    media: [
      post("p1", "Behind the build: multi-agent orchestration in one view", "CAROUSEL_ALBUM", 1, 1284, 96, 210, 14820),
      post("p2", "Shipping a Mac app this week. Split-flap everything.", "IMAGE", 3, 942, 58, 122, 9640),
      post("p3", "How I read 200 emails a day in 30 seconds", "REELS", 5, 3120, 184, 640, 38200),
      post("p4", "Desk setup for late-night sessions", "IMAGE", 7, 611, 33, 74, 7010),
      post("p5", "Crypto BD is just trust at scale", "IMAGE", 9, 806, 71, 96, 8330),
      post("p6", "Warden demo, no cuts", "REELS", 10, 2456, 142, 402, 29110),
    ],
    lastUpdated: new Date().toISOString(),
  };
}
