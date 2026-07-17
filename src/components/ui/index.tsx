import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...a: ClassValue[]): string {
  return twMerge(clsx(a));
}

// ---------- Button ----------
type BtnVariant = "default" | "signal" | "ghost" | "danger";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md";
}

const BTN_VARIANT: Record<BtnVariant, string> = {
  default: "text-ink bg-tile border border-edge shadow-tile hover:bg-tile-hi",
  signal: "text-on-signal bg-signal border border-signal-deep shadow-signal hover:brightness-105",
  ghost: "text-ink-dim bg-transparent border border-transparent hover:text-ink hover:bg-panel",
  danger: "text-neg bg-tile border border-edge shadow-tile hover:bg-tile-hi",
};

export function Button({ variant = "default", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap select-none",
        "transition-[transform,background-color,box-shadow,filter] duration-150 ease-out",
        "active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]",
        BTN_VARIANT[variant],
        className,
      )}
      {...p}
    />
  );
}

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}
export function IconButton({ label, active, className, children, ...p }: IconBtnProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid place-items-center h-7 w-7 rounded-control border transition-colors duration-150 ease-out active:scale-95",
        active
          ? "text-signal bg-tile border-edge"
          : "text-ink-mute bg-transparent border-transparent hover:text-ink hover:bg-panel",
        className,
      )}
      {...p}
    >
      {children}
    </button>
  );
}

// ---------- Tag (functional label, not a decorative pill) ----------
export function Tag({ children, tone = "mute", className }: { children: ReactNode; tone?: "mute" | "signal" | "pos" | "neg"; className?: string }) {
  const tones = {
    mute: "text-ink-mute border-edge-soft",
    signal: "text-signal border-signal-deep/60",
    pos: "text-pos border-pos/40",
    neg: "text-neg border-neg/40",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center h-[18px] px-1.5 rounded-[3px] border bg-board-deep/40 text-[10px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------- Segmented control ----------
interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}
export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-control bg-board-deep border border-seam",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-6 px-2 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 ease-out",
              on ? "bg-tile text-ink shadow-tile" : "text-ink-mute hover:text-ink-dim",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Panel (a board section) ----------
interface PanelProps {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}
export function Panel({ title, right, children, className, bodyClassName }: PanelProps) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-panel border border-edge/70 bg-panel/80 backdrop-blur-[1px] overflow-hidden",
        className,
      )}
    >
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 px-3.5 h-11 border-b border-seam shrink-0">
          {title && <span className="caps">{title}</span>}
          {right}
        </header>
      )}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
