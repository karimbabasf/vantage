import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./SplitFlap.css";

const SEP = new Set([":", " ", "/", ".", ",", "%"]);

function FlapChar({ ch }: { ch: string }) {
  const [d, setD] = useState({ cur: ch, prev: ch, flip: false });
  const curRef = useRef(ch);

  useEffect(() => {
    if (ch === curRef.current) return;
    const prev = curRef.current;
    curRef.current = ch;
    setD({ cur: ch, prev, flip: true });
    const t = setTimeout(() => setD((s) => ({ ...s, flip: false })), 270);
    return () => clearTimeout(t);
  }, [ch]);

  const { cur, prev, flip } = d;
  return (
    <span className="flap" aria-hidden="true">
      <span className="flap-half flap-top">
        <span>{cur}</span>
      </span>
      <span className="flap-half flap-bottom">
        <span>{flip ? prev : cur}</span>
      </span>
      {flip && (
        <>
          <span className="flap-half flap-top flap-fold flap-fold-top">
            <span>{prev}</span>
          </span>
          <span className="flap-half flap-bottom flap-fold flap-fold-bottom">
            <span>{cur}</span>
          </span>
        </>
      )}
      <span className="flap-seam" />
    </span>
  );
}

interface FlapTextProps {
  value: string;
  className?: string;
  style?: CSSProperties;
}

/** Renders a string as a row of split-flap tiles. Any tile whose glyph changes flips. */
export function FlapText({ value, className, style }: FlapTextProps) {
  return (
    <span className={`flaprow ${className ?? ""}`} style={style} aria-label={value} role="text">
      {value.split("").map((c, i) =>
        SEP.has(c) ? (
          <span key={i} className="flap-sep" aria-hidden="true">
            {c}
          </span>
        ) : (
          <FlapChar key={i} ch={c} />
        ),
      )}
    </span>
  );
}
