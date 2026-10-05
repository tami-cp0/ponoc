import { describe, expect, it } from "vitest";
import { MAX_FINDING_WORDS, isTooLong, pickSources, splitCitations } from "./finding";

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

describe("pickSources", () => {
  const searched = ["https://www.toureiffel.paris/en/access-map", "https://en.wikipedia.org/wiki/Eiffel_Tower"];

  it("keeps cited pages the search returned, as the search returned them", () => {
    expect(pickSources(["https://en.wikipedia.org/wiki/Eiffel_Tower/?utm_source=openai#History"], searched)).toEqual([
      "https://en.wikipedia.org/wiki/Eiffel_Tower",
    ]);
  });

  it("drops cited pages the search never saw", () => {
    expect(pickSources(["https://made-up.example/eiffel"], searched)).toEqual([]);
  });

  it("keeps citation order and drops duplicates", () => {
    expect(pickSources([searched[1], searched[0], searched[1]], searched)).toEqual([searched[1], searched[0]]);
  });
});
