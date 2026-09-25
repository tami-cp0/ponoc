import { describe, expect, it } from "vitest";
import { costUsd, creditsFor, toMicros, type Prices } from "./pricing";
import { UsageMeter } from "./UsageMeter";

const prices: Prices = {
  triage: { input: 0.2, output: 1.25 },
  verify: { input: 0.75, output: 4.5 },
  webSearch: 0.01,
  audioPerMinute: 0.0077,
};

describe("UsageMeter", () => {
  it("starts empty", () => {
    expect(new UsageMeter(prices).snapshot()).toEqual({
      audioSeconds: 0,
      inputTokens: 0,
      outputTokens: 0,
      webSearches: 0,
      claimsTrue: 0,
      claimsFalse: 0,
      claimsError: 0,
      costMicros: 0,
      creditsMicros: 0,
    });
  });

  it("turns 16 kHz 16-bit mono bytes into seconds", () => {
    const meter = new UsageMeter(prices);
    meter.addAudio(32_000 * 3);
    meter.addAudio(16_000);
    expect(meter.snapshot().audioSeconds).toBe(4);
  });

  it("sums tokens and searches across calls", () => {
    const meter = new UsageMeter(prices);
    meter.addCall({ role: "triage", input: 100, output: 20, webSearches: 0 });
    meter.addCall({ role: "verify", input: 300, output: 50, webSearches: 2 });
    meter.addCall({ role: "triage", input: 10, output: 5, webSearches: 0 });
    const snap = meter.snapshot();
    expect(snap.inputTokens).toBe(410);
    expect(snap.outputTokens).toBe(75);
    expect(snap.webSearches).toBe(2);
  });

  it("prices each role at its own rate", () => {
    const meter = new UsageMeter(prices);
    meter.addAudio(32_000 * 60);
    meter.addCall({ role: "triage", input: 1000, output: 100, webSearches: 0 });
    meter.addCall({ role: "verify", input: 2000, output: 400, webSearches: 1 });

    const expected = costUsd(
      {
        audioSeconds: 60,
        webSearches: 1,
        triage: { input: 1000, output: 100 },
        verify: { input: 2000, output: 400 },
      },
      prices,
    );
    const snap = meter.snapshot();
    expect(snap.costMicros).toBe(toMicros(expected));
    expect(snap.creditsMicros).toBe(toMicros(creditsFor(expected)));
  });

  it("counts verdicts and errors", () => {
    const meter = new UsageMeter(prices);
    meter.addVerdict(true);
    meter.addVerdict(true);
    meter.addVerdict(false);
    meter.addError();
    const snap = meter.snapshot();
    expect(snap.claimsTrue).toBe(2);
    expect(snap.claimsFalse).toBe(1);
    expect(snap.claimsError).toBe(1);
  });
});
