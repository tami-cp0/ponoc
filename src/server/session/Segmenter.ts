const SENTENCE_END = /[.!?]["')\]]?\s+/;

const DANGLING_WORDS = new Set([
  "and", "or", "but", "because", "so", "which", "that", "who",
  "if", "when", "while", "as", "than", "to", "of", "for", "with",
]);

// Turns finalized STT chunks into utterances: one per sentence, plus the
// trailing chunk. A chunk ending on a dangling word ("and", "because"…) is held
// and joined with the next one, since the speaker hasn't finished the thought.
export class Segmenter {
  private held = "";

  push(text: string): string[] {
    const combined = (this.held + " " + text).trim();
    if (!combined) return [];

    const { complete, remainder } = splitSentences(combined);

    if (remainder && endsOnDanglingWord(remainder)) {
      this.held = remainder;
      return complete;
    }

    this.held = "";
    if (remainder) complete.push(remainder);
    return complete;
  }

  flush(): string[] {
    const remaining = this.held.trim();
    this.held = "";
    return remaining ? [remaining] : [];
  }
}

function endsOnDanglingWord(text: string): boolean {
  const last = text.toLowerCase().replace(/[^a-z]+$/, "").split(/\s+/).pop();
  return last ? DANGLING_WORDS.has(last) : false;
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
