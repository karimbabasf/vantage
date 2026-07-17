import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { BoardHeader } from "@/components/board/BoardHeader";
import { TodayTrack } from "@/components/today/TodayTrack";
import { MailTrack } from "@/components/mail/MailTrack";
import { SignalTrack } from "@/components/signal/SignalTrack";
import { SettingsSheet } from "@/features/settings/SettingsSheet";

const Ambient = lazy(() => import("@/components/ambient/Ambient").then((m) => ({ default: m.Ambient })));

export default function App() {
  const boot = useStore((s) => s.boot);
  const tick = useStore((s) => s.tick);
  const refreshEvents = useStore((s) => s.refreshEvents);
  const refreshMail = useStore((s) => s.refreshMail);
  const refreshIg = useStore((s) => s.refreshIg);
  const refreshSeconds = useStore((s) => s.settings.refreshSeconds);
  const ambient = useStore((s) => s.settings.ambient);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tracksShown, setTracksShown] = useState(false);

  useEffect(() => {
    boot();
  }, [boot]);

  // Backstop for the entrance stagger: the last track finishes at 0.21s + 0.5s,
  // so by now it has either played or never will (see .track-shown in global.css).
  useEffect(() => {
    const id = setTimeout(() => setTracksShown(true), 900);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    const period = Math.max(15, refreshSeconds) * 1000;
    const a = setInterval(() => {
      refreshEvents();
      refreshMail();
    }, period);
    const b = setInterval(() => refreshIg(), 300_000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [refreshEvents, refreshMail, refreshIg, refreshSeconds]);

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden">
      {ambient && (
        <Suspense fallback={null}>
          <Ambient />
        </Suspense>
      )}
      <div className="relative z-10 flex h-full flex-col">
        <BoardHeader onOpenSettings={() => setSettingsOpen(true)} />
        <main className="grid min-h-0 flex-1 grid-cols-[5fr_4fr_3fr] gap-3 px-3 pb-3">
          {[
            <TodayTrack key="today" />,
            <MailTrack key="mail" />,
            <SignalTrack key="signal" onConnect={() => setSettingsOpen(true)} />,
          ].map((el, i) => (
            <div
              key={el.key}
              className={`track-in h-full min-h-0${tracksShown ? " track-shown" : ""}`}
              style={{ animationDelay: `${0.05 + i * 0.08}s` }}
            >
              {el}
            </div>
          ))}
        </main>
      </div>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
