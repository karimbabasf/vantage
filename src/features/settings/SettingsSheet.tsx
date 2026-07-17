import { useEffect, useState, type ReactNode } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, IconButton, cn } from "@/components/ui";
import { data } from "@/lib/data";
import type { Grant } from "@/lib/types";

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="caps text-[9px]">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-ink-dim">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-ink-mute">{hint}</span>}
    </label>
  );
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="min-w-0">
        <span className="block text-[13px] text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-mute">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-150",
          checked ? "border-signal-deep bg-signal/90" : "border-edge bg-board-deep",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[16px] w-[16px] rounded-full transition-transform duration-150",
            checked ? "translate-x-[18px] bg-on-signal" : "translate-x-[2px] bg-ink-dim",
          )}
        />
      </button>
    </div>
  );
}

const inputCls =
  "w-full h-9 rounded-control border border-edge bg-board-deep px-2.5 text-[13px] text-ink placeholder:text-ink-faint " +
  "[box-shadow:inset_0_1px_2px_oklch(0_0_0/0.3)] focus:border-signal/60 focus:outline-none transition-colors";

function GrantChip({ status }: { status: Grant }) {
  const map: Record<Grant, { t: string; c: string }> = {
    granted: { t: "Granted", c: "text-pos border-pos/40" },
    denied: { t: "Denied", c: "text-neg border-neg/40" },
    unknown: { t: "Not asked", c: "text-ink-mute border-edge" },
  };
  const m = map[status];
  return <span className={cn("rounded-[3px] border px-1.5 py-0.5 text-[10px] uppercase tracking-wide", m.c)}>{m.t}</span>;
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const perms = useStore((s) => s.perms);
  const ig = useStore((s) => s.ig);
  const connectIg = useStore((s) => s.connectIg);
  const disconnectIg = useStore((s) => s.disconnectIg);

  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connErr, setConnErr] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(settings.anthropicKeySet);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const connected = !!ig?.connected;

  const doConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setConnErr(null);
    try {
      await connectIg(token.trim());
      setToken("");
    } catch (e) {
      setConnErr(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const saveKey = async () => {
    await data.setAnthropicKey(apiKey);
    const has = !!apiKey.trim();
    setSettings({ anthropicKeySet: has });
    setKeySaved(has);
    setApiKey("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-board-deep/70 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] overflow-hidden rounded-panel border border-edge bg-panel shadow-raise"
        style={{ animation: "sheetIn 180ms var(--ease-out)" }}
      >
        <header className="flex h-12 items-center justify-between border-b border-seam px-5">
          <span className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Settings</span>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </header>

        <div className="max-h-[72vh] space-y-6 overflow-y-auto px-5 py-5">
          <Section title="Access">
            {(["calendar", "mail"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between rounded-control border border-edge/60 bg-tile/40 px-3 py-2">
                <div>
                  <div className="text-[13px] capitalize text-ink">{k}</div>
                  <div className="text-[11px] text-ink-mute">
                    {k === "calendar" ? "Reads today from Calendar.app" : "Reads recent mail from Mail.app"}
                  </div>
                </div>
                <GrantChip status={perms[k]} />
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-ink-faint">
              macOS asks for these the first time Vantage reads them. If you declined, re-enable Vantage under System
              Settings, Privacy and Security.
            </p>
          </Section>

          <Section title="Instagram">
            {connected && ig?.profile ? (
              <div className="flex items-center justify-between rounded-control border border-edge/60 bg-tile/40 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-pos" />
                  <span className="text-[13px] text-ink">Connected as @{ig.profile.username}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => disconnectIg()}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] leading-relaxed text-ink-mute">
                  Needs a Business or Creator account linked to a Facebook Page. Create a Meta app, grant it
                  instagram_basic + instagram_manage_insights + pages_show_list, then generate a long-lived token and
                  paste it below.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openExternal("https://developers.facebook.com/apps/")}>
                    <ExternalLink size={12} /> Meta apps
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openExternal("https://developers.facebook.com/tools/explorer/")}>
                    <ExternalLink size={12} /> Graph Explorer
                  </Button>
                </div>
                <Field label="Long-lived access token">
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="EAAG..."
                    className={inputCls}
                  />
                </Field>
                {connErr && <p className="text-[11px] leading-relaxed text-neg">{connErr}</p>}
                <Button variant="signal" onClick={doConnect} disabled={!token.trim() || connecting}>
                  {connecting ? "Connecting..." : "Connect account"}
                </Button>
              </div>
            )}
          </Section>

          <Section title="You">
            <Field
              label="Your addresses"
              hint="One per line, every address you receive at. Mail sent to one of these ranks as addressed to you; an account whose address is missing here is quietly demoted."
            >
              <textarea
                value={settings.myAddresses.join("\n")}
                onChange={(e) =>
                  setSettings({
                    myAddresses: e.target.value
                      .split("\n")
                      .map((v) => v.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
                rows={2}
                placeholder={"you@gmail.com\nyou@icloud.com"}
                className={cn(inputCls, "h-auto py-2 leading-relaxed")}
              />
            </Field>
            <Field label="Your first name" hint="Used to spot mail that addresses you by name.">
              <input
                value={settings.myFirstName}
                onChange={(e) => setSettings({ myFirstName: e.target.value })}
                placeholder="Alex"
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="Mail triage">
            <Switch
              label="AI triage with Claude"
              hint="Sends subjects and snippets of ambiguous mail to the Anthropic API for a sharper reason line. Off keeps everything on device."
              checked={settings.aiTriage}
              onChange={(v) => setSettings({ aiTriage: v })}
            />
            {settings.aiTriage && (
              <div className="space-y-2">
                <Field label="Anthropic API key" hint={keySaved ? "A key is stored in the Keychain." : "Stored in the macOS Keychain, never in files."}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={keySaved ? "Key saved. Paste to replace." : "sk-ant-..."}
                    className={inputCls}
                  />
                </Field>
                <Button size="sm" onClick={saveKey} disabled={!apiKey.trim()}>
                  Save key
                </Button>
              </div>
            )}
            <Field label="VIP senders" hint="One email address or @domain per line. These always rank to the top.">
              <textarea
                value={settings.vips.join("\n")}
                onChange={(e) => setSettings({ vips: e.target.value.split("\n").map((v) => v.trim()).filter(Boolean) })}
                rows={3}
                placeholder={"paul@ariacap.com\n@stripe.com"}
                className={cn(inputCls, "h-auto py-2 leading-relaxed")}
              />
            </Field>
          </Section>

          <Section title="Board">
            <Switch label="Ambient wash" checked={settings.ambient} onChange={(v) => setSettings({ ambient: v })} />
            <Switch label="24 hour clock" checked={settings.clock24h} onChange={(v) => setSettings({ clock24h: v })} />
            <Field label="Refresh interval (seconds)">
              <input
                type="number"
                min={15}
                max={3600}
                value={settings.refreshSeconds}
                onChange={(e) => setSettings({ refreshSeconds: Math.max(15, Number(e.target.value) || 60) })}
                className={cn(inputCls, "w-28")}
              />
            </Field>
          </Section>
        </div>
      </div>
    </div>
  );
}
