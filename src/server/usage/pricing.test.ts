import { describe, expect, it } from "vitest";
import { CREDIT_USD, MARKUP, costUsd, creditsFor, toMicros, type Prices } from "./pricing";

const prices: Prices = {
  triage: { input: 0.2, output: 1.25 },
  verify: { input: 0.75, output: 4.5 },
  webSearch: 0.01,
  audioPerMinute: 0.0077,
};

const none = { input: 0, output: 0 };
const empty = { audioSeconds: 0, webSearches: 0, triage: none, verify: none };

describe("costUsd", () => {
  it("is zero for no usage", () => {
    expect(costUsd(empty, prices)).toBe(0);
  });

  it("prices each role's input and output tokens per million", () => {
    const cost = costUsd(
      { ...empty, triage: { input: 1_000_000, output: 0 }, verify: { input: 0, output: 1_000_000 } },
      prices,
    );
    expect(cost).toBeCloseTo(0.2 + 4.5, 10);
  });

  it("charges each web search", () => {
    expect(costUsd({ ...empty, webSearches: 3 }, prices)).toBeCloseTo(0.03, 10);
  });

  it("charges audio per minute", () => {
    expect(costUsd({ ...empty, audioSeconds: 90 }, prices)).toBeCloseTo(1.5 * 0.0077, 10);
  });
});

describe("creditsFor", () => {
  it("applies the markup and the credit value", () => {
    expect(creditsFor(1)).toBeCloseTo((1 * MARKUP) / CREDIT_USD, 10);
  });

  it("makes $5 of retail usage worth 25 credits", () => {
    expect(creditsFor(5 / MARKUP)).toBeCloseTo(25, 10);
  });
});

describe("toMicros", () => {
  it("converts to whole millionths", () => {
    expect(toMicros(0.0000015)).toBe(2);
    expect(toMicros(1.25)).toBe(1_250_000);
  });
});
