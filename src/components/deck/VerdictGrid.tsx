"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useUrlDialog } from "@/client/useUrlDialog";
import type { CardStatus } from "@/shared/protocol";
import { Dialog } from "../Dialog";

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
// The stage shows only the newest rows; the rest are in the history popup.
const MAX_ROWS = 3;

export function VerdictGrid({ boxes }: { boxes: VerdictBox[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(1);
  const [boxSize, setBoxSize] = useState(TARGET_BOX);
  const dialog = useUrlDialog();

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
    <>
      <div className="stage-grid" ref={ref}>
        <button
          type="button"
          className="grid-rows"
          style={{ gap: BOX_GAP }}
          disabled={boxes.length === 0}
          aria-label="Show every verdict"
          onClick={() => dialog.open("history")}
        >
          {toRows(boxes, perRow)
            .slice(-MAX_ROWS)
            .reverse()
            .map((row) => (
              <div key={row[0].id} className="grid-row" style={{ gap: BOX_GAP }}>
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
        </button>
      </div>

      {/* Every verdict ever, newest first, in flat colour: there can be thousands. */}
      <Dialog
        open={dialog.current === "history"}
        onClose={() => dialog.close("history")}
        label="Every verdict"
        className="verdict-history"
      >
        <div className="verdict-history-boxes">
          {[...boxes].reverse().map((box) => (
            <span
              key={box.id}
              className="verdict-history-box"
              style={{ background: VERDICT_COLOR[box.status] ?? "#c9c9c9" }}
            />
          ))}
        </div>
      </Dialog>
    </>
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
