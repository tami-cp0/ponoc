import { config } from "../config";

const SENTENCE_END = /[.!?]["')\]]?\s+/;

const dangling: Set<string> = new Set(config.segment.danglingWords);

function endsOnDanglingWord(text: string): boolean {
  const last = text.toLowerCase().replace(/[^a-z]+$/, "").split(/\s+/).pop();
  return last ? dangling.has(last) : false;
}

export class Segmenter {
  private held = "";

  push(text: string): string[] {
    const combined = (this.held + " " + text).trim();
    if (!combined) return [];

    const parts = splitSentences(combined);
    const complete: string[] = [];
    let tail = combined;

    for (const part of parts.complete) complete.push(part);
    tail = parts.remainder;

    // Each finalized STT chunk is already a pause-bounded boundary, so emit the
    // tail as its own utterance. Only hold it when it ends on a dangling
    // conjunction — a clear sign the speaker had not finished the thought.
    if (tail && endsOnDanglingWord(tail)) {
      this.held = tail;
      return complete;
    }

    this.held = "";
    if (tail) complete.push(tail);
    return complete;
  }

  flush(): string[] {
    const remaining = this.held.trim();
    this.held = "";
    return remaining ? [remaining] : [];
  }
}

function splitSentences(text: string): { complete: string[]; remainder: string } {
  const complete: string[] = [];
  let rest = text;
  let match: RegExpMatchArray | null;

  while ((match = rest.match(SENTENCE_END))) {
    const end = match.index! + match[0].length;
    complete.push(rest.slice(0, end).trim());
    rest = rest.slice(end);
  }

  return { complete, remainder: rest.trim() };
}
