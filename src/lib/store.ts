import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarEvent, IgStats, MailItem, PermissionStatus, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { data, type MailAction } from "./data";
import { triage } from "./triage";
import { endOfDay, startOfDay } from "./format";

interface Loading {
  events: boolean;
  mail: boolean;
  ig: boolean;
}

const DISCONNECTED_IG: IgStats = {
  connected: false,
  profile: null,
  followerDelta: null,
  series: [],
  reach24h: null,
  reach7d: null,
  likes7d: null,
  comments7d: null,
  media: [],
  lastUpdated: null,
};

interface VState {
  now: number;
  booted: boolean;
  events: CalendarEvent[];
  mail: MailItem[];
  ig: IgStats | null;
  perms: PermissionStatus;
  settings: Settings;
  loading: Loading;
  error: Partial<Record<keyof Loading, string>>;

  tick: () => void;
  boot: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshMail: () => Promise<void>;
  refreshIg: () => Promise<void>;
  refreshPerms: () => Promise<void>;
  runMailAction: (id: string, action: MailAction) => Promise<void>;
  connectIg: (token: string) => Promise<void>;
  disconnectIg: () => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
}

// Preferences only. igConnected and anthropicKeySet are server-side truth; caching those
// in the browser would let the board claim a connection the server does not actually have.
const prefs = (s: Settings) => ({
  aiTriage: s.aiTriage,
  ambient: s.ambient,
  refreshSeconds: s.refreshSeconds,
  clock24h: s.clock24h,
  myAddresses: s.myAddresses,
  myFirstName: s.myFirstName,
  vips: s.vips,
});

export const useStore = create<VState>()(
  persist(
    (set, get) => ({
      now: Date.now(),
      booted: false,
      events: [],
      mail: [],
      ig: null,
      perms: { calendar: "unknown", mail: "unknown" },
      settings: DEFAULT_SETTINGS,
      loading: { events: true, mail: true, ig: true },
      error: {},

      tick: () => set({ now: Date.now() }),

      boot: async () => {
        await Promise.all([get().refreshPerms(), get().refreshEvents(), get().refreshIg()]);
        await get().refreshMail();
        set({ booted: true });
      },

      refreshEvents: async () => {
        set((s) => ({ loading: { ...s.loading, events: true }, error: { ...s.error, events: undefined } }));
        try {
          const events = await data.fetchEvents(startOfDay().toISOString(), endOfDay().toISOString());
          set((s) => ({ events, loading: { ...s.loading, events: false } }));
        } catch (e) {
          set((s) => ({ loading: { ...s.loading, events: false }, error: { ...s.error, events: String(e) } }));
        }
      },

      refreshMail: async () => {
        set((s) => ({ loading: { ...s.loading, mail: true }, error: { ...s.error, mail: undefined } }));
        const s = get().settings;
        try {
          const raw = await data.fetchRawMail(s.myAddresses, 60);
          const items = triage(raw, {
            events: get().events,
            vips: s.vips,
            myAddresses: s.myAddresses,
            myFirstName: s.myFirstName,
          });
          set((st) => ({
            mail: items,
            loading: { ...st.loading, mail: false },
            perms: { ...st.perms, mail: "granted" },
          }));

          if (s.aiTriage) {
            const cand = items
              .filter((m) => m.bucket !== "noise")
              .slice(0, 15)
              .map((m) => ({ id: m.id, sender: m.senderName, subject: m.subject, snippet: m.snippet }));
            data
              .aiTriage(cand)
              .then((verdicts) => {
                if (!verdicts.length) return;
                const byId = new Map(verdicts.map((v) => [v.id, v.reason]));
                set((st) => ({ mail: st.mail.map((m) => (byId.has(m.id) ? { ...m, aiReason: byId.get(m.id) } : m)) }));
              })
              .catch(() => {});
          }
        } catch (e) {
          const msg = String(e);
          const denied = /denied/i.test(msg);
          set((st) => ({
            loading: { ...st.loading, mail: false },
            error: { ...st.error, mail: msg },
            perms: { ...st.perms, mail: denied ? "denied" : st.perms.mail },
          }));
        }
      },

      refreshIg: async () => {
        set((s) => ({ loading: { ...s.loading, ig: true }, error: { ...s.error, ig: undefined } }));
        try {
          const ig = await data.fetchIg();
          set((s) => ({ ig, loading: { ...s.loading, ig: false } }));
        } catch (e) {
          set((s) => ({ loading: { ...s.loading, ig: false }, error: { ...s.error, ig: String(e) } }));
        }
      },

      refreshPerms: async () => {
        try {
          const perms = await data.fetchPermissions();
          set({ perms });
        } catch {
          /* leave as unknown */
        }
      },

      runMailAction: async (id, action) => {
        const item = get().mail.find((m) => m.id === id);
        set((s) => ({
          mail: s.mail.map((m) =>
            m.id === id
              ? {
                  ...m,
                  unread: action === "read" ? false : action === "unread" ? true : m.unread,
                  flagged: action === "flag" ? true : action === "unflag" ? false : m.flagged,
                }
              : m,
          ),
        }));
        if (!item) return;
        try {
          await data.mailAction(action, item.account, item.mailbox, id);
        } catch {
          get().refreshMail();
        }
      },

      connectIg: async (token) => {
        set((s) => ({ loading: { ...s.loading, ig: true }, error: { ...s.error, ig: undefined } }));
        try {
          const ig = await data.igConnect(token);
          set((s) => ({
            ig,
            loading: { ...s.loading, ig: false },
            settings: { ...s.settings, igConnected: ig.connected },
          }));
        } catch (e) {
          set((s) => ({ loading: { ...s.loading, ig: false }, error: { ...s.error, ig: String(e) } }));
          throw e;
        }
      },

      disconnectIg: async () => {
        try {
          await data.igDisconnect();
        } catch {
          /* ignore */
        }
        set((s) => ({ ig: DISCONNECTED_IG, settings: { ...s.settings, igConnected: false } }));
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: "vantage.settings",
      version: 1,
      partialize: (s) => ({ settings: prefs(s.settings) }),
      // Persisted settings are a subset, so merge them onto the defaults rather than
      // letting zustand's shallow merge replace the whole settings object.
      merge: (persisted, current) => {
        const saved = (persisted as { settings?: Partial<Settings> } | undefined)?.settings;
        return { ...current, settings: { ...current.settings, ...saved } };
      },
    },
  ),
);
