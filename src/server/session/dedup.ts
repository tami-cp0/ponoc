const FILLER = new Set([
  "well", "so", "like", "you", "know", "i", "mean", "actually",
  "basically", "literally", "um", "uh", "just", "really",
]);

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .map((w) => NUMBER_WORDS[w] ?? w)
    .join(" ")
    .trim();
}

export function similarity(a: string, b: string): number {
  const wa = new Set(normalize(a).split(" ").filter(Boolean));
  const wb = new Set(normalize(b).split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;

  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;

  const jaccard = shared / (wa.size + wb.size - shared);
  const containment = shared / Math.min(wa.size, wb.size);
  return Math.max(jaccard, containment);
}
