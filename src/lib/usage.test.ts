import { describe, expect, it } from "vitest";
import { UsageMeter, cardTotal } from "./usage";
import type { TokenUsage } from "./types";

const u = (input: number, output: number): TokenUsage => ({
  input,
  output,
  total: input + output,
});

describe("UsageMeter", () => {
  it("starts at zero", () => {
    expect(new UsageMeter().total).toEqual({ input: 0, output: 0, total: 0 });
  });

  it("accumulates recorded usage into the session total", () => {
    const m = new UsageMeter();
    m.record(u(10, 5));
    m.record(u(20, 30));
    expect(m.total).toEqual({ input: 30, output: 35, total: 65 });
  });

  it("returns the recorded call's own total", () => {
    expect(new UsageMeter().record(u(10, 5))).toBe(15);
  });

  it("treats missing usage as zero", () => {
    const m = new UsageMeter();
    expect(m.record(undefined)).toBe(0);
    expect(m.total).toEqual({ input: 0, output: 0, total: 0 });
  });
});

describe("cardTotal", () => {
  it("sums triage and verify totals", () => {
    expect(cardTotal(u(10, 5), u(100, 50))).toBe(165);
  });

  it("tolerates a missing side", () => {
    expect(cardTotal(undefined, u(100, 50))).toBe(150);
    expect(cardTotal(u(10, 5), undefined)).toBe(15);
    expect(cardTotal(undefined, undefined)).toBe(0);
  });
});
