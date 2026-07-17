// Local, explainable mail triage. Runs fully on-device with zero setup.
// Produces a 0..100 score, a bucket, and a one-line human reason for each message.
// The optional Claude pass (backend) can enrich `aiReason`; this heuristic is the always-on baseline.

import type { CalendarEvent, MailBucket, MailItem, RawMail } from "./types";
import { clamp } from "./format";

export interface TriageContext {
  events: CalendarEvent[];
  vips: string[];
  myAddresses: string[];
  myFirstName: string;
  now?: number;
}

const URGENCY = [
  /\burgent\b/i, /\basap\b/i, /\beod\b/i, /\bdeadline\b/i, /action required/i,
  /past due/i, /\boverdue\b/i, /final notice/i, /time.?sensitive/i, /\brespond by\b/i,
];
const NOREPLY = /(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|notifications?@|mailer@|automated@|updates?@)/i;
const MONEY = [/invoice/i, /payment/i, /\breceipt\b/i, /refund/i, /\bwire\b/i, /\btransfer\b/i, /past due/i];
const INVITE = /^\s*(invitation:|invite:|accepted:|declined:|updated invitation)/i;

function domainOf(addr: string): string {
  const i = addr.indexOf("@");
  return i >= 0 ? addr.slice(i + 1).toLowerCase() : "";
}

function vipMatch(addr: string, vips: string[]): boolean {
  const a = addr.toLowerCase();
  const dom = domainOf(a);
  return vips.some((raw) => {
    const v = raw.toLowerCase().trim();
    if (!v) return false;
    return v.startsWith("@") ? dom === v.slice(1) : a === v;
  });
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Addresses (and domains) of people you share a calendar event with today.
function meetingContacts(events: CalendarEvent[]): { addrs: Set<string>; domains: Set<string> } {
  const addrs = new Set<string>();
  const domains = new Set<string>();
  for (const e of events) {
    for (const a of e.attendees ?? []) {
      const low = a.toLowerCase();
      addrs.add(low);
      const d = domainOf(low);
      if (d) domains.add(d);
    }
  }
  return { addrs, domains };
}

const REASON_PRIORITY: Array<[string, string]> = [
  ["meeting", "You meet them today"],
  ["vip", "VIP sender"],
  ["flagged", "You flagged this"],
  ["urgent", "Flags urgency"],
  ["money", "Money or invoice"],
  ["question", "Asks a question"],
  ["direct", "Sent to you directly"],
  ["named", "Mentions you by name"],
  ["reply", "Ongoing thread"],
  ["invite", "Calendar invite"],
  ["cc", "You are cc'd"],
];

const NOISE_REASON: Array<[string, string]> = [
  ["noreply", "Automated / no-reply"],
  ["bulk", "Newsletter or list mail"],
];

function buildReason(tags: string[], bucket: MailBucket): string {
  if (bucket === "noise") {
    for (const [tag, text] of NOISE_REASON) if (tags.includes(tag)) return text;
    return "Low priority";
  }
  const hits: string[] = [];
  for (const [tag, text] of REASON_PRIORITY) {
    if (tags.includes(tag)) hits.push(text);
    if (hits.length === 2) break;
  }
  if (hits.length === 0) return bucket === "attention" ? "Needs a look" : "For your awareness";
  return hits.join(" · ");
}

export function triageOne(
  m: RawMail,
  ctx: TriageContext,
  contacts: { addrs: Set<string>; domains: Set<string> },
): MailItem {
  const now = ctx.now ?? Date.now();
  const tags: string[] = [];
  let score = 0;

  const subj = m.subject || "";
  const text = `${subj} ${m.snippet || ""}`;
  const addr = m.senderAddress.toLowerCase();

  if (m.flagged) { score += 30; tags.push("flagged"); }
  if (vipMatch(addr, ctx.vips)) { score += 40; tags.push("vip"); }
  if (m.unread) { score += 8; tags.push("unread"); }

  if (NOREPLY.test(addr)) { score -= 14; tags.push("noreply"); }
  if (m.bulk) { score -= 26; tags.push("bulk"); }

  if (m.toMe && !m.bulk) { score += 18; tags.push("direct"); }
  else if (!m.toMe && !m.bulk) { score += 3; tags.push("cc"); }

  if (URGENCY.some((r) => r.test(subj))) { score += 18; tags.push("urgent"); }
  if (/\?/.test(subj)) { score += 8; tags.push("question"); }
  if (MONEY.some((r) => r.test(subj))) { score += 12; tags.push("money"); }
  if (/^\s*re:/i.test(subj)) { score += 6; tags.push("reply"); }
  if (INVITE.test(subj)) { score += 10; tags.push("invite"); }

  if (ctx.myFirstName) {
    const nameRe = new RegExp(`\\b${escapeRe(ctx.myFirstName)}\\b`, "i");
    if (nameRe.test(text)) { score += 8; tags.push("named"); }
  }

  if (contacts.addrs.has(addr)) { score += 22; tags.push("meeting"); }
  else if (contacts.domains.has(domainOf(addr))) { score += 8; tags.push("meeting"); }

  const ageMin = (now - Date.parse(m.date)) / 60000;
  if (ageMin <= 180) { score += 8; tags.push("fresh"); }
  else if (ageMin <= 1440) { score += 3; }

  score = clamp(Math.round(score), 0, 100);
  const bucket: MailBucket = score >= 45 ? "attention" : score >= 18 ? "fyi" : "noise";

  return { ...m, score, bucket, reason: buildReason(tags, bucket), reasonTags: tags };
}

export function triage(list: RawMail[], ctx: TriageContext): MailItem[] {
  const contacts = meetingContacts(ctx.events);
  return list
    .map((m) => triageOne(m, ctx, contacts))
    .sort((a, b) => b.score - a.score || Date.parse(b.date) - Date.parse(a.date));
}

export function bucketCounts(items: MailItem[]): Record<MailBucket, number> {
  const out: Record<MailBucket, number> = { attention: 0, fyi: 0, noise: 0 };
  for (const it of items) out[it.bucket]++;
  return out;
}
