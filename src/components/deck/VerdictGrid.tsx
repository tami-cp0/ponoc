"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CardStatus } from "@/shared/protocol";

export interface VerdictBox {
  id: string;
  claimId: string;
  status: CardStatus;
}

const VERDICT_COLOR: Record<string, string> = {
  true: "#1C5334",
  false: "#8E1A1A",
  verifying: "#c9c9c9",
};

const TARGET_BOX = 14; // px; the real size divides the width evenly
const BOX_GAP = 1.5;

// One box per verdict, filling left→right; each new row stacks above the last.
export function VerdictGrid({ boxes }: { boxes: VerdictBox[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(1);
  const [boxSize, setBoxSize] = useState(TARGET_BOX);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const count = Math.max(1, Math.floor((w + BOX_GAP) / (TARGET_BOX + BOX_GAP)));
      setPerRow(count);
      setBoxSize((w - (count - 1) * BOX_GAP) / count);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="stage-grid" ref={ref}>
      <div className="grid-rows" style={{ gap: BOX_GAP }}>
        {toRows(boxes, perRow)
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

function toRows(boxes: VerdictBox[], perRow: number): VerdictBox[][] {
  const rows: VerdictBox[][] = [];
  for (let i = 0; i < boxes.length; i += perRow) rows.push(boxes.slice(i, i + perRow));
  return rows;
}

// Avalanche hash: neighbouring ids give unrelated values, so there's no visible
// order to which boxes flicker when.
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
