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

it("takes every third sample at 48 kHz, across render quanta", () => {
  posted.length = 0;
  const worklet = new Processor({ processorOptions: { targetRate: 16000 } });
  // A ramp that never repeats within a chunk, so any skipped or zeroed sample shows.
  const input = Float32Array.from({ length: 4800 }, (_, i) => (i + 1) / 10_000);
  for (let i = 0; i < input.length; i += 128) worklet.process([[input.subarray(i, i + 128)]]);

  const expected = Int16Array.from({ length: 1600 }, (_, k) => input[k * 3] * 0x7fff);
  expect(new Int16Array(posted[0])).toEqual(expected);
});

it("keeps posting 100 ms chunks after the first", () => {
  posted.length = 0;
  const worklet = new Processor({ processorOptions: { targetRate: 16000 } });
  const frame = new Float32Array(128).fill(0.1);

  // One second of 48 kHz audio in 128-sample render quanta.
  for (let i = 0; i < 375; i++) worklet.process([[frame]]);

  expect(posted.length).toBeGreaterThanOrEqual(9);
  expect(posted.every((b) => b.byteLength === 3200)).toBe(true);
});
