"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Seeded, so the server render and the first client render match (no hydration mismatch).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID_ROWS = 7;
const BOX = 12;
const GAP = 3;
const STEP = BOX + GAP;
const TRUE = "#16a34a";
const FALSE = "#dc2626";

// Every non-verdict cell is grey — NEVER white. Empty cells are a faint grey
// just below the bg (so the sheen/flicker can never brighten them past the page
// surface into a second white); filled greys go darker from there.
function boxColor(rand: () => number): string {
  const r = rand();
  if (r < 0.11) return TRUE;
  if (r < 0.17) return FALSE;
  if (r < 0.5) return "rgb(228, 228, 228)"; // faint grey, below the #F5F5F5 bg
  const v = 165 + Math.floor(rand() * 40); // 165–205 grey
  return `rgb(${v}, ${v}, ${v})`;
}

// The deck's .grid-box blocks, coloured by verdict. Flicker and sheen live in CSS.
export function ShimmerGrid() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(48);

  // Fill the container: measure the block row's width and lay down as many
  // columns as fit, so the grid spans the full inner width (inside the lip).
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

  const rows = useMemo(() => {
    const rand = mulberry32(20260919);
    return Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: cols }, () => ({
        color: boxColor(rand),
        delay: rand() * 6,
        duration: 5 + rand() * 3,
      })),
    );
  }, [cols]);

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
