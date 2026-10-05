import { extractSources } from "@/shared/sources";
import { cleanUrl } from "@/shared/url";

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

// The model's citations, limited to pages its web search actually returned, so a
// misremembered or invented URL never becomes a source button.
export function pickSources(cited: string[], searched: string[]): string[] {
  const byKey = new Map(searched.map((url) => [pageKey(url), cleanUrl(url)]));
  const picked = cited.map((url) => byKey.get(pageKey(url))).filter((url) => url !== undefined);
  return [...new Set(picked)];
}

// Same page despite tracking params, a #fragment or a trailing slash.
function pageKey(raw: string): string {
  try {
    const url = new URL(cleanUrl(raw));
    url.hash = "";
    return url.toString().replace(/\/(?=$|\?)/, "");
  } catch {
    return raw;
  }
}
