"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

const TARGET_CELL = 11;
const CELL_GAP = 3;
const BLINK_SPEED = 2400;
export const BLEED_DURATION = 1500;
export const CELL_FADE = 480;

export type Phase = "blinking" | "bleeding" | "verdict";

interface Cell {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shade: string;
  bleedDelay: number;
  blinkDelay: number;
  blinkDuration: number;
}

function grayShade(): string {
  const v = Math.floor(Math.random() * 210) + 30;
  return `rgb(${v}, ${v}, ${v})`;
}

function buildCells(w: number, h: number): Cell[] {
  const step = TARGET_CELL + CELL_GAP;
  const cols = Math.max(1, Math.round(w / step));
  const rows = Math.max(1, Math.round(h / step));
  const colW = w / cols;
  const rowH = h / rows;
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        id: `${r}-${c}`,
        x: c * colW,
        y: r * rowH,
        w: colW - CELL_GAP,
        h: rowH - CELL_GAP,
        shade: grayShade(),
        bleedDelay: Math.random() * BLEED_DURATION,
        blinkDelay: Math.random() * BLINK_SPEED,
        blinkDuration: BLINK_SPEED + Math.random() * 800,
      });
    }
  }
  return cells;
}

// Measured synchronously before first paint, so a card waiting in the deck never
// shows an empty white frame. offsetWidth/Height ignore the card's entry
// rotation, which getBoundingClientRect would include.
export function useCells(ref: RefObject<HTMLElement | null>): Cell[] {
  const [cells, setCells] = useState<Cell[]>([]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const build = () => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) setCells(buildCells(el.offsetWidth, el.offsetHeight));
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return cells;
}

// The loading grid: cells blink while verifying, then bleed one by one into the
// verdict colour. Each cell keeps its grey as the base and fades the verdict in
// on top, so a cell still waiting for its delay never flashes dark.
export function CellGrid({ cells, phase, verdictColor }: { cells: Cell[]; phase: Phase; verdictColor: string | null }) {
  const bleeding = phase === "bleeding" && verdictColor !== null;

  return (
    <div className="absolute inset-0 z-10">
      {cells.map((cell) => {
        const style: CSSProperties = {
          position: "absolute",
          left: cell.x,
          top: cell.y,
          width: cell.w,
          height: cell.h,
          backgroundColor: cell.shade,
          opacity: bleeding ? 1 : undefined,
          transition: bleeding ? `opacity ${CELL_FADE}ms ease` : undefined,
          animation: bleeding
            ? `cell-bleed ${CELL_FADE}ms ease ${cell.bleedDelay}ms both`
            : phase === "blinking"
              ? `grid-blink ${cell.blinkDuration}ms ease-in-out ${cell.blinkDelay}ms infinite backwards`
              : undefined,
          ["--verdict" as string]: verdictColor ?? undefined,
          ["--shade" as string]: cell.shade,
        };
        return <div key={cell.id} className="grid-cell" style={style} />;
      })}
    </div>
  );
}
