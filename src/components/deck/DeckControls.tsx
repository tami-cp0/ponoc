"use client";

import { motion } from "motion/react";
import { Button } from "../Button";
import { FrequencyVisualizer } from "./FrequencyVisualizer";

const VIZ_W = 168;
const VIZ_H = 82;
const CTRL_GAP = 12;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface Props {
  running: boolean;
  connecting: boolean;
  // The app is stopping the session itself (credits ran out): show Stop pressed.
  stopping: boolean;
  onToggle: () => void;
  onReset: () => void;
  getAnalyser: () => AnalyserNode | null;
}

export function DeckControls({ running, connecting, stopping, onToggle, onReset, getAnalyser }: Props) {
  const open = running || connecting;
  // Closing waits for the visualizer to sink first.
  const gap = open ? { duration: 0.22, ease: EASE } : { duration: 0.22, ease: EASE, delay: 0.3 };

  return (
    <div className="stage-controls">
      <Button height="var(--control-height)" squareEdge={open ? null : "right"} pressed={stopping} onClick={onToggle}>
        {open ? "Stop" : "Start"}
      </Button>

      <motion.div
        className="ctrl-viz"
        style={{ height: VIZ_H }}
        initial={false}
        animate={{
          width: open ? VIZ_W : 0,
          marginLeft: open ? CTRL_GAP : 0,
          marginRight: open ? CTRL_GAP : 0,
          scale: running ? 1 : 0.6,
          opacity: running ? 1 : 0,
          y: running ? 0 : 14,
        }}
        transition={{
          width: gap,
          marginLeft: gap,
          marginRight: gap,
          scale: running ? { duration: 0.55, ease: EASE, delay: 0.16 } : { duration: 0.4, ease: EASE },
          opacity: running ? { duration: 0.4, delay: 0.16 } : { duration: 0.3 },
          y: running ? { duration: 0.55, ease: EASE, delay: 0.16 } : { duration: 0.4, ease: EASE },
        }}
        aria-hidden={!running}
      >
        <FrequencyVisualizer active={running} getAnalyser={getAnalyser} />
      </motion.div>

      <Button height="var(--control-height)" squareEdge={open ? null : "left"} onClick={onReset}>
        reset
      </Button>
    </div>
  );
}
