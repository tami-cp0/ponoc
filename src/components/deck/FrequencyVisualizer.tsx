"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 14;
// Resting height as a fraction of the bar TRACK (the track is 60% of the viz),
// so this reads as a small, even line when there's no sound.
const IDLE = 0.34;
const PEAK = 0.92;

// dB window. getByteFrequencyData already returns values mapped from the
// analyser's minDecibels..maxDecibels onto 0..255, so we just work in that
// normalised 0..1 space and gate/scale from there.
const GATE = 0.1; // below this a band is silent
const ATTACK = 0.5; // fast rise toward a new peak
const DECAY = 0.06; // slow, gravity-like fall

interface Props {
  active: boolean;
  getAnalyser: () => AnalyserNode | null;
}

// A spectrum visualizer. While active it splits the mic spectrum into BAR_COUNT
// log-spaced bands (low→high, left→right), scales each band by its own weight so
// every bar can swing across the full range instead of the bass-heavy lows
// dominating the left, and animates with a fast attack / slow decay so the bars
// fluctuate the way a real analyzer does. Idle bars rest at an equal height.
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
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let bands: { start: number; end: number; weight: number }[] | null = null;
    const heights = new Array(BAR_COUNT).fill(IDLE);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const analyser = getAnalyser();
      if (!analyser) return;

      const binCount = analyser.frequencyBinCount;
      if (!freq || freq.length !== binCount) {
        freq = new Uint8Array(new ArrayBuffer(binCount));
        bands = buildBands(binCount);
      }
      analyser.getByteFrequencyData(freq);

      for (let i = 0; i < BAR_COUNT; i++) {
        const { start, end, weight } = bands![i];
        // Peak within the band (peaks read more lively than averages).
        let max = 0;
        for (let b = start; b < end; b++) if (freq[b] > max) max = freq[b];

        // Normalise and apply the band's weight so highs are lifted to match the
        // lows — this is what stops the left from always winning.
        let level = (max / 255) * weight;
        if (level < GATE) level = 0;
        level = Math.min(1, level);

        const target = IDLE + level * (PEAK - IDLE);
        const prev = heights[i];
        // Snap up quickly to a louder target, drift down slowly otherwise.
        heights[i] = target > prev ? prev + (target - prev) * ATTACK : prev + (target - prev) * DECAY;

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

// Split the spectrum into BAR_COUNT log-spaced bands. Each band gets a weight
// that rises with frequency, compensating for the natural roll-off of voice
// energy toward the highs so every bar swings across a comparable range.
function buildBands(binCount: number): { start: number; end: number; weight: number }[] {
  const lo = 1; // skip the DC bin
  const hi = Math.floor(binCount * 0.75); // ignore the near-silent top end
  const bands: { start: number; end: number; weight: number }[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const start = Math.round(lo * Math.pow(hi / lo, i / BAR_COUNT));
    const end = Math.max(start + 1, Math.round(lo * Math.pow(hi / lo, (i + 1) / BAR_COUNT)));
    // Weight from 1.0 at the lowest band up to ~2.6 at the highest.
    const weight = 1 + 1.6 * (i / (BAR_COUNT - 1));
    bands.push({ start, end, weight });
  }
  return bands;
}
