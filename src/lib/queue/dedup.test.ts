import { describe, expect, it } from "vitest";
import { normalize, similarity } from "./dedup";

describe("normalize", () => {
  it("lowercases, strips punctuation and filler", () => {
    expect(normalize("Well, the GDP grew 4%!")).toBe("the gdp grew 4");
  });

  it("collapses whitespace", () => {
    expect(normalize("too    many   spaces")).toBe("too many spaces");
  });
});

describe("similarity", () => {
  it("is 1 for identical normalized text", () => {
    expect(similarity("GDP grew 4%", "gdp grew 4")).toBe(1);
  });

  it("is high for a rephrase that shares most words", () => {
    const s = similarity(
      "unemployment fell last year",
      "unemployment fell sharply last year",
    );
    expect(s).toBeGreaterThan(0.7);
  });

  it("is low for unrelated claims", () => {
    const s = similarity(
      "the earth orbits the sun",
      "coffee is grown in brazil",
    );
    expect(s).toBeLessThan(0.3);
  });

  it("catches a mid-sentence self-correction of a number", () => {
    const s = similarity(
      "we shipped 500 units",
      "we shipped 600 units",
    );
    expect(s).toBeGreaterThan(0.6);
  });
});
