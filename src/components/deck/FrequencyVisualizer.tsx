"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 14;
// Heights are fractions of the bar track.
const IDLE = 0.34;
const PEAK = 0.92;

// Levels are 0..1: getByteFrequencyData already maps the analyser's dB window onto 0..255.
const GATE = 0.1; // below this a band counts as silent
const ATTACK = 0.5; // fast rise toward a louder level
const DECAY = 0.06; // slow fall

interface Band {
  start: number;
  end: number;
  weight: number;
}

interface Props {
  active: boolean;
  getAnalyser: () => AnalyserNode | null;
}

// Splits the mic spectrum into log-spaced bands, low→high left→right. Each band
// is weighted so the quieter highs swing as much as the bass-heavy lows.
export function FrequencyVisualizer({ active, getAnalyser }: Props) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!active) {
      for (const bar of barsRef.current) {
        if (bar) bar.style.height = `${IDLE * 100}%`;
      }
      return;
    }

    let raf = 0;
    let freq = new Uint8Array(0);
    let bands: Band[] = [];
    const heights: number[] = new Array(BAR_COUNT).fill(IDLE);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const analyser = getAnalyser();
      if (!analyser) return;

      if (freq.length !== analyser.frequencyBinCount) {
        freq = new Uint8Array(analyser.frequencyBinCount);
        bands = buildBands(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(freq);

      for (let i = 0; i < BAR_COUNT; i++) {
        const { start, end, weight } = bands[i];
        // The band's peak reads livelier than its average.
        let max = 0;
        for (let b = start; b < end; b++) if (freq[b] > max) max = freq[b];

        let level = (max / 255) * weight;
        if (level < GATE) level = 0;
        level = Math.min(1, level);

        const target = IDLE + level * (PEAK - IDLE);
        const prev = heights[i];
        heights[i] = prev + (target - prev) * (target > prev ? ATTACK : DECAY);

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

function buildBands(binCount: number): Band[] {
  const lo = 1; // skip the DC bin
  const hi = Math.floor(binCount * 0.75); // the top quarter is near-silent for voice
  const bands: Band[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const start = Math.round(lo * Math.pow(hi / lo, i / BAR_COUNT));
    const end = Math.max(start + 1, Math.round(lo * Math.pow(hi / lo, (i + 1) / BAR_COUNT)));
    const weight = 1 + 1.6 * (i / (BAR_COUNT - 1)); // 1.0 → 2.6
    bands.push({ start, end, weight });
  }
  return bands;
}
