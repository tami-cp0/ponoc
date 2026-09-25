import { cleanUrl } from "./url";

// The verify model often cites inside its reasoning, as markdown links or bare
// URLs. Pull those out so they become source buttons and the text reads cleanly.
export function extractSources(reasoning: string): { text: string; urls: string[] } {
  const urls: string[] = [];

  let text = reasoning.replace(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g, (_, url) => {
    urls.push(cleanUrl(url));
    return "";
  });
  text = text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    urls.push(cleanUrl(url));
    return "";
  });

  // Tidy the seams left behind: empty brackets, doubled spaces, space before punctuation.
  text = text
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { text, urls: [...new Set(urls)] };
}
