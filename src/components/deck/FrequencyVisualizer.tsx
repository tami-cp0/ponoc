"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 14;
// Resting height (fraction of track) when no audio is coming in — every bar
// sits at this same level so the idle visualizer reads as a flat, even row.
const IDLE = 0.18;
const MAX = 1;

interface Props {
  // True while a session is live. When false the bars hold their idle state.
  active: boolean;
  // Accessor for the live mic analyser (null when no session is running).
  getAnalyser: () => AnalyserNode | null;
}

// The frequency visualizer. It renders BAR_COUNT grooves and, while a session
// is active, drives each bar's height from the mic's frequency spectrum on every
// animation frame. With no input the bars settle to an equal idle height and
// only move once the microphone actually receives audio.
export function FrequencyVisualizer({ active, getAnalyser }: Props) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!active) {
      // Ease every bar back to the shared idle height when we stop.
      for (const bar of barsRef.current) {
        if (bar) bar.style.height = `${IDLE * 100}%`;
      }
      return;
    }

    let raf = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    // Per-bar smoothed heights, so bars fall back gently instead of snapping.
    const heights = new Array(BAR_COUNT).fill(IDLE);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const analyser = getAnalyser();
      if (!analyser) return;

      if (!freq || freq.length !== analyser.frequencyBinCount) {
        freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      analyser.getByteFrequencyData(freq);

      // Fold the spectrum down to BAR_COUNT bars. Low frequencies carry most of
      // a voice's energy, so sampling the lower bins keeps the bars lively.
      const usable = Math.floor(freq.length * 0.7);
      const per = Math.max(1, Math.floor(usable / BAR_COUNT));

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < per; j++) sum += freq[i * per + j] ?? 0;
        // Normalise to 0..1 and lift the noise floor so quiet input still
        // registers as gentle movement around the idle line.
        const level = sum / per / 255;
        const target = Math.min(MAX, IDLE + level * 1.35);
        // Rise fast, fall slow — the classic responsive-but-smooth meter feel.
        const prev = heights[i];
        heights[i] = target > prev ? target : prev + (target - prev) * 0.22;
        const bar = barsRef.current[i];
        if (bar) bar.style.height = `${(heights[i] * 100).toFixed(1)}%`;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, getAnalyser]);

  return (
    <div className="viz-bars">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="viz-bar"
          style={{ height: `${IDLE * 100}%` }}
        />
      ))}
    </div>
  );
}
