import type { ReactNode } from "react";
import { cn } from "@/components/ui";

interface Props {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: string;
}

export function StatTile({ label, value, icon, tone }: Props) {
  return (
    <div className="rounded-[6px] border border-edge/50 bg-tile/50 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-ink-mute">
        {icon}
        <span className="caps text-[9px]">{label}</span>
      </div>
      <div className={cn("font-mono text-[19px] leading-none tabular-nums text-ink", tone)}>{value}</div>
    </div>
  );
}
