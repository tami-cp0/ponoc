import { describe, expect, it } from "vitest";
import { MAX_FINDING_WORDS, isTooLong, splitCitations } from "./finding";

describe("splitCitations", () => {
  it("pulls citation links out into sources, keeping the text whole", () => {
    const out = splitCitations(
      "Brain scans show we use nearly all of it ([scientificamerican.com](https://www.scientificamerican.com/a?utm_source=openai)).",
    );
    expect(out.text).toBe("Brain scans show we use nearly all of it.");
    expect(out.sources).toEqual(["https://www.scientificamerican.com/a"]);
  });

  it("never shortens the text", () => {
    const long = Array.from({ length: 50 }, (_, i) => `w${i}`).join(" ") + ".";
    expect(splitCitations(long).text).toBe(long);
  });
});

describe("isTooLong", () => {
  const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

  it("accepts a finding at the limit", () => {
    expect(isTooLong(words(MAX_FINDING_WORDS))).toBe(false);
  });

  it("flags a finding over the limit", () => {
    expect(isTooLong(words(MAX_FINDING_WORDS + 1))).toBe(true);
  });
});
