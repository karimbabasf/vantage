// Data provider. Talks to the local Vantage server over HTTP; when that server
// is not running (plain `pnpm dev` in a browser) it falls back to mock data, so
// the whole UI still runs standalone. One swap point for the app.

import type { CalendarEvent, IgStats, PermissionStatus, RawMail } from "./types";
import { getMockEvents, getMockIg, getMockRawMail } from "./mock";

// The server rejects anything without this header. A cross-origin page cannot
// send it without a preflight the server never answers, which keeps other sites
// out of your mail and calendar.
const HEADERS: HeadersInit = {
  "content-type": "application/json",
  "x-vantage-client": "1",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let probe: Promise<boolean> | null = null;

/** Is the Rust server behind us? Probed once, then cached for the session. */
export function isLive(): Promise<boolean> {
  probe ??= fetch("/api/health", { headers: HEADERS })
    .then((r) => r.ok)
    .catch(() => false);
  return probe;
}

async function call<T>(path: string, init: RequestInit, mock: () => T): Promise<T> {
  if (!(await isLive())) {
    await wait(140);
    return mock();
  }

  const res = await fetch(`/api${path}`, { ...init, headers: HEADERS });

  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (b as { error?: string }).error)
      .catch(() => undefined);
    throw new Error(detail ?? `${path} failed: ${res.status} ${res.statusText}`);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const get = <T>(path: string, mock: () => T) => call<T>(path, { method: "GET" }, mock);

const send = <T>(path: string, body: unknown, mock: () => T, method = "POST") =>
  call<T>(path, { method, body: JSON.stringify(body) }, mock);

export type MailAction = "read" | "unread" | "flag" | "unflag" | "open";

export interface AiItem {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
}
export interface AiVerdict {
  id: string;
  reason: string;
}

export const data = {
  fetchEvents(startIso: string, endIso: string): Promise<CalendarEvent[]> {
    const q = new URLSearchParams({ start: startIso, end: endIso });
    return get(`/events?${q}`, getMockEvents);
  },
  fetchRawMail(myAddresses: string[], limit = 60): Promise<RawMail[]> {
    return send("/mail/list", { myAddresses, limit }, getMockRawMail);
  },
  fetchIg(): Promise<IgStats> {
    return get("/instagram", getMockIg);
  },
  igRefresh(): Promise<IgStats> {
    return send("/instagram/refresh", {}, getMockIg);
  },
  igConnect(token: string): Promise<IgStats> {
    return send("/instagram/connect", { token }, getMockIg);
  },
  igDisconnect(): Promise<void> {
    return send("/instagram/disconnect", {}, () => undefined);
  },
  fetchPermissions(): Promise<PermissionStatus> {
    return get("/permissions", () => ({ calendar: "granted", mail: "granted" }));
  },
  mailAction(action: MailAction, account: string, mailbox: string, id: string): Promise<void> {
    return send("/mail/action", { action, account, mailbox, id }, () => undefined);
  },
  setAnthropicKey(key: string): Promise<void> {
    return send("/anthropic-key", { key }, () => undefined, "PUT");
  },
  aiTriage(items: AiItem[]): Promise<AiVerdict[]> {
    return send("/ai/triage", items, () => [] as AiVerdict[]);
  },
};
