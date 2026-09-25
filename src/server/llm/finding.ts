import { extractSources } from "@/shared/sources";

// The prompt asks for 25 words; above this the server logs it. The text itself is
// never cut: the card shrinks it to fit (components/card/useFitText.ts).
export const MAX_FINDING_WORDS = 30;

// Moves citation links out of the text (they become source buttons).
export function splitCitations(reasoning: string): { text: string; sources: string[] } {
  const { text, urls } = extractSources(reasoning);
  return { text, sources: urls };
}

export function isTooLong(text: string): boolean {
  return text.split(/\s+/).filter(Boolean).length > MAX_FINDING_WORDS;
}
