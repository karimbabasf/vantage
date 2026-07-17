import { useEffect, useRef } from "react";
import { animate } from "animejs";

interface Props {
  n: number;
  format: (v: number) => string;
  className?: string;
}

/** Animated numeric readout (anime.js). Counts from the previous value to the new one. */
export function CountUp({ n, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);

  useEffect(() => {
    const obj = { v: from.current };
    from.current = n;
    const anim = animate(obj, {
      v: n,
      duration: 750,
      ease: "outExpo",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = format(Math.round(obj.v));
      },
    });
    return () => {
      anim.pause();
    };
  }, [n, format]);

  return (
    <span ref={ref} className={className}>
      {format(n)}
    </span>
  );
}
