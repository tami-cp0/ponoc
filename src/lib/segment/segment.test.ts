import { describe, expect, it } from "vitest";
import { Segmenter } from "./segment";

describe("Segmenter", () => {
  it("splits a segment into one utterance per sentence", () => {
    const seg = new Segmenter();
    const out = seg.push("The sky is blue. Water boils at 100 degrees.");
    expect(out).toEqual([
      "The sky is blue.",
      "Water boils at 100 degrees.",
    ]);
  });

  it("emits each finalized chunk even without terminal punctuation", () => {
    const seg = new Segmenter();
    // Deepgram finalizes on a pause, so each chunk is its own utterance —
    // two separate claims must not be merged just because periods are missing.
    expect(seg.push("They say Nigerians are lazy")).toEqual([
      "They say Nigerians are lazy",
    ]);
    expect(seg.push("English teachers do not teach properly")).toEqual([
      "English teachers do not teach properly",
    ]);
  });

  it("holds a fragment ending on a dangling conjunction", () => {
    const seg = new Segmenter();
    expect(seg.push("Unemployment fell, and")).toEqual([]);
    expect(seg.push("wages rose.")).toEqual([
      "Unemployment fell, and wages rose.",
    ]);
  });

  it("emits both a completed sentence and the trailing chunk", () => {
    const seg = new Segmenter();
    expect(seg.push("First claim is true. Second claim")).toEqual([
      "First claim is true.",
      "Second claim",
    ]);
  });

  it("flushes a held dangling fragment on demand", () => {
    const seg = new Segmenter();
    seg.push("Wages rose because");
    expect(seg.flush()).toEqual(["Wages rose because"]);
    expect(seg.flush()).toEqual([]);
  });

  it("ignores empty and whitespace-only input", () => {
    const seg = new Segmenter();
    expect(seg.push("   ")).toEqual([]);
    expect(seg.push("")).toEqual([]);
  });

  it("treats question and exclamation marks as boundaries", () => {
    const seg = new Segmenter();
    expect(seg.push("Is that true? It is!")).toEqual([
      "Is that true?",
      "It is!",
    ]);
  });
});
