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

const LINK_CHECK_MS = 1500;
const LINK_CACHE_MS = 6 * 60 * 60 * 1000;
const LINK_CACHE_SIZE = 2000;
// Sites that block bots answer these while still opening fine in a browser.
const BOT_BLOCKED = new Set([401, 403, 429]);
// The server doesn't take HEAD, so it needs a GET to tell.
const NO_HEAD = new Set([405, 501]);
const HEADERS = { "user-agent": "Mozilla/5.0 (compatible; ponoc-linkcheck)" };

const checked = new Map<string, { alive: boolean; at: number }>();

// Drops sources that won't open (refused, timed out, missing, server error), so
// a source button never leads to an error page. Checked in parallel with a HEAD
// request (no page body), and remembered so a repeat source costs nothing.
export async function dropDeadLinks(urls: string[], fetcher: typeof fetch = fetch): Promise<string[]> {
  const alive = await Promise.all(urls.map((url) => isAlive(url, fetcher)));
  return urls.filter((_, i) => alive[i]);
}

async function isAlive(url: string, fetcher: typeof fetch): Promise<boolean> {
  const hit = checked.get(url);
  if (hit && Date.now() - hit.at < LINK_CACHE_MS) return hit.alive;

  const alive = await opens(url, fetcher);
  checked.delete(url);
  checked.set(url, { alive, at: Date.now() });
  // Oldest first, so this drops the least recently checked.
  if (checked.size > LINK_CACHE_SIZE) checked.delete(checked.keys().next().value!);
  return alive;
}

async function opens(url: string, fetcher: typeof fetch): Promise<boolean> {
  const signal = AbortSignal.timeout(LINK_CHECK_MS);
  try {
    let res = await fetcher(url, { method: "HEAD", redirect: "follow", signal, headers: HEADERS });
    if (NO_HEAD.has(res.status)) {
      // One byte, and the body is dropped as soon as the status is in.
      res = await fetcher(url, { redirect: "follow", signal, headers: { ...HEADERS, range: "bytes=0-0" } });
      void res.body?.cancel().catch(() => {});
    }
    return res.ok || BOT_BLOCKED.has(res.status);
  } catch {
    return false;
  }
}
