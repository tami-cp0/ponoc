"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CardStatus } from "../../lib/types";

export interface LogBox {
  id: string;
  claimId: string;
  status: CardStatus;
}

const VERDICT_COLOR: Record<string, string> = {
  true: "#1C5334",
  false: "#8E1A1A",
  error: "#8a8a8a",
  verifying: "#c9c9c9",
  none: "#c9c9c9",
};

const TARGET_BOX = 14; // px — target square size; actual size divides width evenly
const BOX_GAP = 1.5;

export function SessionsGrid({ boxes }: { boxes: LogBox[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(1);
  const [boxSize, setBoxSize] = useState(TARGET_BOX);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const step = TARGET_BOX + BOX_GAP;
      const count = Math.max(1, Math.floor((w + BOX_GAP) / step));
      const size = (w - (count - 1) * BOX_GAP) / count;
      setPerRow(count);
      setBoxSize(size);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="stage-grid" ref={ref}>
      <div className="grid-rows" style={{ gap: BOX_GAP }}>
        {/* Boxes fill left→right; each new row stacks above the previous. */}
        {chunk(boxes, perRow)
          .slice()
          .reverse()
          .map((row, ri) => (
            <div key={ri} className="grid-row" style={{ gap: BOX_GAP }}>
              {row.map((box) => (
                <motion.span
                  key={box.id}
                  className="grid-box"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    width: boxSize,
                    height: boxSize,
                    animationDelay: `${-(hash(box.id) % 14000)}ms`,
                    animationDuration: `${9000 + (hash(box.id + "dur") % 6000)}ms`,
                    ["--box" as string]: VERDICT_COLOR[box.status] ?? "#c9c9c9",
                  }}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Strong avalanche hash: adjacent ids produce wildly uncorrelated values, so
// there is no readable order to which boxes flicker when.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}
