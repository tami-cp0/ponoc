// The landing's verdict grid pattern, shared with the share card so both draw
// the same blocks.

// Seeded, so the server render and the first client render match (no hydration mismatch).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GRID_ROWS = 7;
export const BOX = 12;
export const GAP = 3;
export const STEP = BOX + GAP;
const TRUE = "#16a34a";
const FALSE = "#dc2626";

// Every non-verdict cell is grey — NEVER white. Empty cells are a faint grey
// just below the bg (so the sheen/flicker can never brighten them past the page
// surface into a second white); filled greys go darker from there.
function boxColor(rand: () => number): string {
  const r = rand();
  if (r < 0.11) return TRUE;
  if (r < 0.17) return FALSE;
  if (r < 0.5) return "rgb(228, 228, 228)"; // faint grey, below the #F5F5F5 bg
  const v = 165 + Math.floor(rand() * 40); // 165–205 grey
  return `rgb(${v}, ${v}, ${v})`;
}

export function buildGrid(cols: number) {
  const rand = mulberry32(20260919);
  return Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: cols }, () => ({
      color: boxColor(rand),
      delay: rand() * 6,
      duration: 5 + rand() * 3,
    })),
  );
}
