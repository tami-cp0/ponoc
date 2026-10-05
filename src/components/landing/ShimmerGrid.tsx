"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BOX, GAP, STEP, buildGrid } from "./grid-pattern";

export function ShimmerGrid() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(48);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setCols(Math.max(1, Math.floor(w / STEP)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo(() => buildGrid(cols), [cols]);

  return (
    <div className="lp-grid-frame">
      <div className="lp-grid-rows" ref={trackRef} aria-hidden>
        {rows.map((row, r) => (
          <div className="lp-grid-row" key={r}>
            {row.map((cell, c) => (
              <div
                key={c}
                className="grid-box"
                style={{
                  width: BOX,
                  height: BOX,
                  margin: GAP / 2,
                  backgroundColor: cell.color,
                  animationDelay: `${cell.delay}s`,
                  animationDuration: `${cell.duration}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="lp-grid-sheen" aria-hidden />
    </div>
  );
}
