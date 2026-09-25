import { describe, expect, it } from "vitest";
import { spreadVerdicts } from "./history";

describe("spreadVerdicts", () => {
  it("returns every verdict", () => {
    const out = spreadVerdicts(7, 3);
    expect(out.filter((v) => v)).toHaveLength(7);
    expect(out.filter((v) => !v)).toHaveLength(3);
  });

  it("spreads the falses among the trues instead of grouping them", () => {
    expect(spreadVerdicts(2, 2)).toEqual([true, false, true, false]);
    expect(spreadVerdicts(4, 1)).toEqual([true, true, true, true, false]);
  });

  it("handles all-true, all-false and empty sessions", () => {
    expect(spreadVerdicts(3, 0)).toEqual([true, true, true]);
    expect(spreadVerdicts(0, 2)).toEqual([false, false]);
    expect(spreadVerdicts(0, 0)).toEqual([]);
  });
});
