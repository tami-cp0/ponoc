import { beforeAll, expect, it } from "vitest";

// Runs public/pcm-worklet.js outside an AudioWorkletGlobalScope, with a port that
// transfers buffers the way the real one does.
let Processor: new (options: unknown) => { process: (inputs: Float32Array[][]) => boolean };
const posted: ArrayBuffer[] = [];

beforeAll(async () => {
  Object.assign(globalThis, {
    sampleRate: 48000,
    AudioWorkletProcessor: class {
      port = {
        postMessage: (buffer: ArrayBuffer, transfer: ArrayBuffer[]) =>
          posted.push(structuredClone(buffer, { transfer })),
      };
    },
    registerProcessor: (_name: string, cls: typeof Processor) => {
      Processor = cls;
    },
  });
  // @ts-expect-error -- a plain worklet script, not a module
  await import("../../public/pcm-worklet.js");
});

// Plays `seconds` of `wave` into a worklet running at `rate`, in 128-sample render
// quanta, and returns every 16 kHz sample it posted.
function play(rate: number, seconds: number, wave: (t: number) => number): Int16Array {
  Object.assign(globalThis, { sampleRate: rate });
  posted.length = 0;
  const worklet = new Processor({ processorOptions: { targetRate: 16000 } });
  const input = Float32Array.from({ length: Math.ceil((rate * seconds) / 128) * 128 }, (_, i) => wave(i / rate));
  for (let i = 0; i < input.length; i += 128) worklet.process([[input.subarray(i, i + 128)]]);
  return Int16Array.from(posted.flatMap((b) => Array.from(new Int16Array(b))));
}

// Skips the first chunk, where the filter is still filling up.
function rms(samples: Int16Array): number {
  const settled = samples.subarray(1600);
  return Math.sqrt(settled.reduce((sum, v) => sum + v * v, 0) / settled.length);
}

const tone = (hz: number) => (t: number) => 0.5 * Math.sin(2 * Math.PI * hz * t);
// A 0.5 sine's RMS as 16-bit samples.
const FULL = (0.5 / Math.SQRT2) * 0x7fff;

it("posts 100 ms chunks of 16 kHz audio from 48 and 44.1 kHz mics", () => {
  for (const rate of [48000, 44100]) {
    play(rate, 1, () => 0.1);
    expect(posted.length).toBeGreaterThanOrEqual(9);
    expect(posted.every((b) => b.byteLength === 3200)).toBe(true);
  }
});

it("keeps speech at its level", () => {
  for (const rate of [48000, 44100]) {
    expect(Math.abs(rms(play(rate, 0.5, tone(1000))) - FULL)).toBeLessThan(FULL * 0.01);
  }
});

it("removes sound above 8 kHz instead of folding it back into the speech", () => {
  // Without a filter, 12 kHz at 48 kHz would come back as a 4 kHz tone at full level.
  expect(rms(play(48000, 0.5, tone(12000)))).toBeLessThan(FULL / 1000);
  expect(rms(play(44100, 0.5, tone(11000)))).toBeLessThan(FULL / 1000);
});

it("passes a 16 kHz mic through unchanged", () => {
  const out = play(16000, 0.2, (t) => ((t * 16000) % 1000) / 2000);
  const expected = Int16Array.from({ length: out.length }, (_, k) => Math.round(((k % 1000) / 2000) * 0x7fff));
  expect(out).toEqual(expected);
});
