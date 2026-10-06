import { describe, expect, it } from "vitest";
import { spreadVerdicts } from "./history";

describe("spreadVerdicts", () => {
  it("returns every verdict", () => {
    const out = spreadVerdicts(7, 3, 2);
    expect(out.filter((v) => v === "true")).toHaveLength(7);
    expect(out.filter((v) => v === "false")).toHaveLength(3);
    expect(out.filter((v) => v === "unsure")).toHaveLength(2);
  });

  it("spreads the falses among the trues instead of grouping them", () => {
    expect(spreadVerdicts(2, 2)).toEqual(["true", "false", "true", "false"]);
    expect(spreadVerdicts(4, 1)).toEqual(["true", "true", "true", "true", "false"]);
  });

  it("spreads the unsures among the rest", () => {
    expect(spreadVerdicts(4, 0, 2)).toEqual(["true", "true", "unsure", "true", "true", "unsure"]);
    expect(spreadVerdicts(0, 0, 2)).toEqual(["unsure", "unsure"]);
  });

  it("handles all-true, all-false and empty sessions", () => {
    expect(spreadVerdicts(3, 0)).toEqual(["true", "true", "true"]);
    expect(spreadVerdicts(0, 2)).toEqual(["false", "false"]);
    expect(spreadVerdicts(0, 0)).toEqual([]);
  });
});
