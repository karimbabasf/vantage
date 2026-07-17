import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, Heart, MessageCircle, Radio, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Panel, Segmented, cn } from "@/components/ui";
import { FlapText } from "@/components/board/SplitFlap";
import { CountUp } from "@/components/board/CountUp";
import { Sparkline } from "./Sparkline";
import { StatTile } from "./StatTile";
import { PostCard } from "./PostCard";
import { fmtCompact, fmtCount, fmtDelta, fmtRelative } from "@/lib/format";

type Win = "24h" | "7d";

export function SignalTrack({ onConnect }: { onConnect: () => void }) {
  const ig = useStore((s) => s.ig);
  const loading = useStore((s) => s.loading.ig);
  const now = useStore((s) => s.now);
  const refreshIg = useStore((s) => s.refreshIg);
  const [win, setWin] = useState<Win>("7d");

  if (loading && !ig) {
    return (
      <Panel title="Signal" bodyClassName="flex flex-col">
        <Skeleton />
      </Panel>
    );
  }

  if (!ig || !ig.connected || !ig.profile) {
    return (
      <Panel title="Signal" bodyClassName="flex flex-col">
        <ConnectState onConnect={onConnect} />
      </Panel>
    );
  }

  const p = ig.profile;
  const delta = win === "24h" ? ig.followerDelta?.d24h ?? 0 : ig.followerDelta?.d7d ?? 0;
  const reach = win === "24h" ? ig.reach24h : ig.reach7d;
  const series = ig.series.map((s) => s.followers);
  const up = delta >= 0;

  return (
    <Panel
      title="Signal"
      bodyClassName="flex flex-col"
      right={
        <Segmented
          value={win}
          onChange={setWin}
          options={[
            { value: "24h", label: "24h" },
            { value: "7d", label: "7d" },
          ]}
        />
      }
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-edge bg-tile font-display text-[15px] font-bold text-ink-dim">
            {p.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">@{p.username}</div>
            <div className="font-mono text-[10px] tabular-nums text-ink-mute">
              {fmtCompact(p.mediaCount)} posts / {fmtCompact(p.following ?? 0)} following
            </div>
          </div>
          <button
            onClick={() => refreshIg()}
            className="ml-auto text-ink-faint transition-colors hover:text-ink-dim"
            aria-label="Refresh Instagram"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="rounded-[8px] border border-edge/50 bg-tile/40 p-3.5">
          <div className="caps mb-2 text-[9px]">Followers</div>
          <FlapText value={fmtCount(p.followers)} style={{ fontSize: 26 }} />
          <div className="mt-2.5 flex items-center gap-1.5">
            {up ? <ArrowUp size={13} className="text-pos" /> : <ArrowDown size={13} className="text-neg" />}
            <span className={cn("font-mono text-[13px] tabular-nums", up ? "text-pos" : "text-neg")}>
              {fmtDelta(delta)}
            </span>
            <span className="caps ml-1 text-[9px]">{win}</span>
          </div>
          <div className="mt-3">
            <Sparkline points={series} className="h-[42px] w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label={`Reach ${win}`}
            value={reach != null ? <CountUp n={reach} format={fmtCompact} /> : "--"}
            icon={<Eye size={12} />}
          />
          <StatTile
            label="Likes 7d"
            value={ig.likes7d != null ? <CountUp n={ig.likes7d} format={fmtCompact} /> : "--"}
            icon={<Heart size={12} />}
          />
          <StatTile
            label="Comments 7d"
            value={ig.comments7d != null ? <CountUp n={ig.comments7d} format={fmtCompact} /> : "--"}
            icon={<MessageCircle size={12} />}
          />
          <StatTile label="Posts" value={<CountUp n={p.mediaCount} format={fmtCompact} />} />
        </div>

        <div>
          <div className="caps mb-1.5 text-[9px]">Recent posts</div>
          {ig.media.slice(0, 5).map((m) => (
            <PostCard key={m.id} m={m} />
          ))}
        </div>

        {ig.lastUpdated && (
          <div className="pt-1 text-center font-mono text-[10px] text-ink-faint">
            updated {fmtRelative(ig.lastUpdated, now)}
          </div>
        )}
      </div>
    </Panel>
  );
}

function ConnectState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Radio size={26} strokeWidth={1.5} className="text-ink-faint" />
      <span className="font-display text-[14px] font-semibold text-ink-dim">Connect Instagram</span>
      <span className="max-w-[30ch] text-[12px] leading-relaxed text-ink-mute">
        Link a Business or Creator account to track followers, reach, and engagement over 24h and 7d.
      </span>
      <Button variant="signal" onClick={onConnect} className="mt-1">
        Connect account
      </Button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 space-y-4 p-3">
      <div className="h-9 w-2/3 animate-pulse rounded bg-tile/50" />
      <div className="h-28 animate-pulse rounded-[8px] bg-tile/40" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[6px] bg-tile/40" />
        ))}
      </div>
    </div>
  );
}
