import { extractSources } from "@/shared/sources";

// Findings longer than this are logged. The card shrinks long text to fit.
export const MAX_FINDING_WORDS = 30;

// Moves citation links out of the text (they become source buttons).
export function splitCitations(reasoning: string): { text: string; sources: string[] } {
  const { text, urls } = extractSources(reasoning);
  return { text, sources: urls };
}

export function isTooLong(text: string): boolean {
  return text.split(/\s+/).filter(Boolean).length > MAX_FINDING_WORDS;
}
