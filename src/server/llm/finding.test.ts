import { describe, expect, it } from "vitest";
import { MAX_FINDING_WORDS, dropDeadLinks, isTooLong, pickSources, splitCitations } from "./finding";

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

describe("dropDeadLinks", () => {
  const status = (code: number) => async () => new Response(null, { status: code });

  it("keeps pages that open, and ones that only block bots", async () => {
    const codes: Record<string, number> = { "https://a.test/": 200, "https://b.test/": 403 };
    const fetcher = (async (url: string) => status(codes[url])()) as typeof fetch;
    expect(await dropDeadLinks(["https://a.test/", "https://b.test/"], fetcher)).toEqual([
      "https://a.test/",
      "https://b.test/",
    ]);
  });

  it("drops missing pages and server errors", async () => {
    expect(await dropDeadLinks(["https://missing.test/"], status(404) as typeof fetch)).toEqual([]);
    expect(await dropDeadLinks(["https://broken.test/"], status(503) as typeof fetch)).toEqual([]);
  });

  it("drops sites that refuse the connection", async () => {
    const refused = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await dropDeadLinks(["https://scienceline.ucsb.edu/getkey.php?key=3038"], refused)).toEqual([]);
  });

  it("asks with HEAD, falling back to a one-byte GET only when HEAD isn't supported", async () => {
    const calls: { method: string; range?: string }[] = [];
    const fetcher = (async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      calls.push({ method: init.method ?? "GET", range: headers.range });
      return new Response(null, { status: init.method === "HEAD" ? 405 : 206 });
    }) as typeof fetch;
    expect(await dropDeadLinks(["https://no-head.test/"], fetcher)).toEqual(["https://no-head.test/"]);
    expect(calls).toEqual([{ method: "HEAD" }, { method: "GET", range: "bytes=0-0" }]);
  });

  it("remembers a checked link instead of asking again", async () => {
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    await dropDeadLinks(["https://cached.test/"], fetcher);
    await dropDeadLinks(["https://cached.test/"], fetcher);
    expect(calls).toBe(1);
  });
});
