"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Card } from "../../lib/types";

const VERDICT = {
  true: { word: "TRUE", base: "#1C5334", deep: "#0F3F25" },
  false: { word: "FALSE", base: "#8E1A1A", deep: "#6E1111" },
} as const;

const TARGET_CELL = 11;
const CELL_GAP = 3;
const BLINK_SPEED = 2400;
const BLEED_DURATION = 1500; // window over which cells flip to the verdict color
const CELL_FADE = 480;

interface Cell {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shade: string;
  bleedDelay: number;
  blinkDelay: number;
  blinkDuration: number;
}

function grayShade(): string {
  const v = Math.floor(Math.random() * 210) + 30;
  return `rgb(${v}, ${v}, ${v})`;
}

// The hostname makes a compact, readable label for a source button
// (e.g. https://www.bbc.com/news/… → "bbc.com"). Falls back to the raw
// string if it isn't a parseable URL.
function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// The verify model often embeds its citations directly in the reasoning prose —
// as markdown links `[label](url)` or bare URLs — rather than only in the
// structured sources array. Pull those out so they render as source buttons and
// the displayed reasoning reads cleanly without raw URLs in it.
function extractSources(reasoning: string): { text: string; urls: string[] } {
  const urls: string[] = [];
  let text = reasoning;

  // Markdown links first: [label](url) → drop the whole token, keep the url.
  text = text.replace(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g, (_, url) => {
    urls.push(cleanUrl(url));
    return "";
  });

  // Then any remaining bare URLs left in the prose.
  text = text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    urls.push(cleanUrl(url));
    return "";
  });

  // Tidy the seams left where links were removed (stray brackets, doubled
  // spaces, spaces before punctuation, orphaned separators).
  text = text
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+$/g, "")
    .trim();

  return { text, urls: [...new Set(urls)] };
}

// Strip tracking query params (e.g. utm_source=openai the web-search tool
// appends) so cited URLs read clean. Leaves everything else untouched.
function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

// Sources rendered as clickable buttons at the bottom of the card's back face.
// One source → a single labelled pill. Multiple sources → a circular trigger
// that, when tapped, bounces the individual source buttons up into existence.
function SourceLinks({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Motion attaches its drag pointerdown listener to the card element and reacts
  // in the bubble phase. We attach our own NATIVE bubble-phase listeners to the
  // source island: the event still reaches the child link/button first (so the
  // click works), then we stop it at the island before it bubbles up to the card
  // — so pressing a source never starts a card drag/flip.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const swallow = (e: Event) => e.stopPropagation();
    el.addEventListener("pointerdown", swallow);
    el.addEventListener("pointerup", swallow);
    el.addEventListener("mousedown", swallow);
    el.addEventListener("touchstart", swallow);
    return () => {
      el.removeEventListener("pointerdown", swallow);
      el.removeEventListener("pointerup", swallow);
      el.removeEventListener("mousedown", swallow);
      el.removeEventListener("touchstart", swallow);
    };
  }, [open]);

  if (sources.length === 0) return null;

  const pill =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150";
  const pillStyle: CSSProperties = {
    borderColor: "rgba(255,255,255,0.28)",
    color: "rgba(255,255,255,0.85)",
    background: "rgba(255,255,255,0.06)",
  };
  if (sources.length === 1) {
    return (
      <div
        ref={rootRef}
        className="mt-auto flex justify-center pt-4"
        style={{ position: "relative", zIndex: 10000 }}
      >
        <a href={sources[0]} target="_blank" rel="noopener noreferrer" className={pill} style={pillStyle}>
          <LinkIcon />
          {sourceLabel(sources[0])}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="mt-auto flex flex-col items-center pt-4"
      style={{ position: "relative", zIndex: 10000 }}
    >
      {/* Expanded links overlay the findings text (absolute, anchored just above
          the circle) rather than pushing layout, so long findings never collide
          with them. */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 flex-col items-center gap-1.5"
            initial={false}
          >
            {sources.map((url, i) => (
              <motion.a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={pill}
                style={pillStyle}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.32, ease: [0.34, 1.3, 0.5, 1], delay: i * 0.05 }}
              >
                <LinkIcon />
                {sourceLabel(url)}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide sources" : `Show ${sources.length} sources`}
        aria-expanded={open}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-colors duration-150"
        style={{
          borderColor: "rgba(255,255,255,0.28)",
          color: "rgba(255,255,255,0.9)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        {open ? <LinkIcon /> : sources.length}
      </button>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Phase = "blinking" | "bleeding" | "verdict";

interface CardProps {
  card: Card;
  onDismiss: () => void;
  // The physical card spin is owned by the deck (it holds the 3D transform), so
  // the flip is controlled from there. When these are omitted the card falls
  // back to its own local content-swap (used by the non-3D pages).
  flipped?: boolean;
  onToggleFlip?: () => void;
  // Fired once the reveal animation has fully finished and the verdict is shown,
  // so the deck knows the back face exists and a swipe-up may flip the card.
  onVerdictReady?: () => void;
}

export function ClaimCardMonolith({ card, onDismiss, flipped, onToggleFlip, onVerdictReady }: CardProps) {
  const settled = card.status === "true" || card.status === "false";
  const v = card.status === "true" || card.status === "false" ? VERDICT[card.status] : null;

  // Controlled by the deck when a spin owner is present; otherwise self-managed.
  const controlled = onToggleFlip !== undefined;
  const [localFinding, setLocalFinding] = useState(false);
  const showFinding = controlled ? Boolean(flipped) : localFinding;
  const toggleFinding = (next: boolean) => {
    if (controlled) onToggleFlip!();
    else setLocalFinding(next);
  };
  const [phase, setPhase] = useState<Phase>(settled ? "verdict" : "blinking");
  const [cells, setCells] = useState<Cell[]>([]);
  const articleRef = useRef<HTMLElement>(null);
  // The blinking→bleed loading animation plays at most once, only for a card
  // that started life unsettled. A card mounted already-settled (e.g. retrieved
  // from sessions) shows its verdict directly and never re-runs the animation.
  const mountedUnsettled = useRef(!settled);

  // Measure the card and build the grid. useLayoutEffect + a synchronous
  // measure means cells exist before first paint — no white frame while a
  // verifying card waits behind others in the deck.
  useLayoutEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const build = (w: number, h: number) => {
      if (w === 0 || h === 0) return;
      const step = TARGET_CELL + CELL_GAP;
      const cols = Math.max(1, Math.round(w / step));
      const rows = Math.max(1, Math.round(h / step));
      const colW = w / cols;
      const rowH = h / rows;
      const out: Cell[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          out.push({
            id: `${r}-${c}`,
            x: c * colW,
            y: r * rowH,
            w: colW - CELL_GAP,
            h: rowH - CELL_GAP,
            shade: grayShade(),
            bleedDelay: Math.random() * BLEED_DURATION,
            blinkDelay: Math.random() * BLINK_SPEED,
            blinkDuration: BLINK_SPEED + Math.random() * 800,
          });
        }
      }
      setCells(out);
    };
    // Use offset dimensions: border-box, matching the grid's inset-0 box, and
    // unaffected by the entry rotation (getBoundingClientRect returns the
    // rotated bounding box, which would size the grid wrong).
    build(el.offsetWidth, el.offsetHeight);
    const ro = new ResizeObserver(() => {
      build(el.offsetWidth, el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drive the bleed → verdict sequence once, only for a card that started
  // unsettled and is now resolving. Cards mounted already-settled skip it.
  useEffect(() => {
    if (!settled || !mountedUnsettled.current) return;
    let timer = 0;
    const raf = requestAnimationFrame(() => {
      setPhase("bleeding");
      timer = window.setTimeout(() => setPhase("verdict"), BLEED_DURATION + CELL_FADE);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [settled]);

  // Once the reveal has fully resolved, tell the deck the back face is ready so a
  // swipe-up may flip the card. Covers both a card that finishes the bleed and
  // one mounted already-settled (phase starts at "verdict").
  useEffect(() => {
    if (phase === "verdict" && settled) onVerdictReady?.();
  }, [phase, settled, onVerdictReady]);

  // Card bg stays neutral through blinking + bleeding (only the squares color);
  // it flips to the verdict gradient last, as the grid resolves to the verdict.
  const surface =
    v && phase === "verdict"
      ? `radial-gradient(120% 90% at 20% 0%, ${v.base} 0%, ${v.deep} 78%)`
      : "var(--bg)";
  const showGrid = phase !== "verdict";
  // The model may embed citation links inside the reasoning prose. Pull them out
  // so the text reads clean and the URLs become source buttons — merged with any
  // that already arrived in the structured sources array.
  const extracted = card.reasoning ? extractSources(card.reasoning) : { text: "", urls: [] };
  const findingText = extracted.text;
  const findingSources = [...new Set([...(card.sources ?? []), ...extracted.urls])];
  const hasFinding = Boolean(card.reasoning);
  const finding = showFinding && hasFinding;
  // In controlled (physical-spin) mode the finding lives on the card's real back
  // face, so the front never swaps to it — the whole card turns around instead.
  const frontFinding = controlled ? false : finding;
  const showBackFace = controlled && phase === "verdict" && settled && hasFinding;

  return (
    <>
    <article
      ref={articleRef}
      className="absolute inset-0 flex flex-col overflow-hidden px-7 pt-6 pb-6"
      style={{
        background: surface,
        containerType: phase === "verdict" ? "inline-size" : "normal",
        // In spin mode the back must stay hidden until the card turns past 90°.
        backfaceVisibility: controlled ? "hidden" : undefined,
        WebkitBackfaceVisibility: controlled ? "hidden" : undefined,
        borderRadius: controlled ? "inherit" : undefined,
        // backface-visibility hides the away-facing side visually, but the front
        // <article> is still hit-testable and overlaps the back face. Once the
        // card is flipped to its finding, disable pointer events on the front so
        // its bottom "the finding" button can't be clicked through the back.
        pointerEvents: controlled && showFinding ? "none" : undefined,
      }}
      onClick={onDismiss}
    >
      {settled && <span className="slab-grain" aria-hidden />}

      {/* Grid: blinking, then bleeding to the verdict color */}
      {showGrid && (
        <div className="absolute inset-0 z-10">
          {cells.map((cell) => {
            const bleeding = phase === "bleeding" && v;
            const style: CSSProperties = {
              position: "absolute",
              left: cell.x,
              top: cell.y,
              width: cell.w,
              height: cell.h,
              // The cell keeps its gray shade as the base; the bleed animation
              // fades in the verdict color on top per-cell, so waiting cells
              // stay gray (never flash dark) until their delay elapses.
              backgroundColor: cell.shade,
              opacity: bleeding ? 1 : undefined,
              transition: bleeding ? `opacity ${CELL_FADE}ms ease` : undefined,
              animation: bleeding
                ? `cell-bleed ${CELL_FADE}ms ease ${cell.bleedDelay}ms both`
                : phase === "blinking"
                  ? `grid-blink ${cell.blinkDuration}ms ease-in-out ${cell.blinkDelay}ms infinite backwards`
                  : undefined,
              ["--verdict" as string]: v ? v.base : undefined,
              ["--shade" as string]: cell.shade,
            };
            return <div key={cell.id} className="grid-cell" style={style} />;
          })}
        </div>
      )}

      {/* Verdict content, revealed once the grid has fully bled */}
      {phase === "verdict" && settled && (
        <>
          {frontFinding ? (
            <div key="finding" className="face relative z-20 flex h-full flex-col" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleFinding(false)}
                className="verdict-back group flex w-full items-center gap-2 py-2 font-mono text-[9px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
                style={
                  {
                    color: "rgba(255,255,255,0.7)",
                    opacity: 0.9,
                    "--edge": "rgba(255,255,255,0.28)",
                  } as CSSProperties
                }
                aria-label="Back to the verdict"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="transition-transform duration-200 group-hover:-translate-x-0.5"
                  aria-hidden
                >
                  <path d="M11.5 5L6.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                The verdict
              </button>
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="finding-scroll mt-1 min-h-0 flex-1 overflow-y-auto font-expose text-md leading-[1.62]" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {findingText}
                </p>
                {findingSources.length > 0 && <SourceLinks sources={findingSources} />}
              </div>
            </div>
          ) : (
            <div key="verdict" className="face relative z-20 flex h-full flex-col" onClick={(e) => e.stopPropagation()}>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: "rgba(255,255,255,0.55)" }}>
                claim
              </span>
              <p className="mt-3 font-expose text-lg leading-[1.5]" style={{ color: "rgba(255,255,255,0.85)" }}>
                {card.claim}
              </p>
              <div className="flex flex-1 items-center justify-center py-4">
                <span
                  className="stamp block whitespace-nowrap font-array-wide font-semibold leading-none tracking-[-0.03em] text-white"
                  style={{ fontSize: "40cqw" }}
                >
                  {v!.word}
                </span>
              </div>
              {card.reasoning && (
                <button
                  onClick={() => toggleFinding(true)}
                  className="group mt-auto flex w-full items-center justify-between border-t border-dashed pt-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
                  style={{ borderColor: "rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.7)", opacity: 0.9 }}
                >
                  the finding
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </article>

    {/* Physical back face: the finding. Pre-rotated 180° in the deck-card's 3D
        space so that when the whole card spins it faces the viewer, reading
        correctly — like turning around to see who's behind you. Only mounted in
        controlled (spin) mode; the flat pages keep the front-swap behaviour. */}
    {showBackFace && (
      <article
        className="absolute inset-0 flex flex-col overflow-hidden px-7 pt-6 pb-6"
        style={{
          background: surface,
          containerType: "inline-size",
          transform: "rotateY(180deg)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          borderRadius: "inherit",
          // Mirror of the front guard: while the card faces its verdict (not yet
          // flipped), the back face is turned away — disable its pointer events
          // so it can't catch clicks meant for the front.
          pointerEvents: showFinding ? undefined : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {settled && <span className="slab-grain" aria-hidden />}
        <div className="face relative z-20 flex h-full flex-col">
          <button
            onClick={() => toggleFinding(false)}
            className="verdict-back group flex w-full items-center gap-2 py-2 font-mono text-[9px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
            style={
              {
                color: "rgba(255,255,255,0.7)",
                opacity: 0.9,
                "--edge": "rgba(255,255,255,0.28)",
              } as CSSProperties
            }
            aria-label="Back to the verdict"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden
            >
              <path d="M11.5 5L6.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            The verdict
          </button>
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="finding-scroll mt-1 min-h-0 flex-1 overflow-y-auto font-expose text-md leading-[1.62]" style={{ color: "rgba(255,255,255,0.9)" }}>
              {findingText}
            </p>
            {findingSources.length > 0 && <SourceLinks sources={findingSources} />}
          </div>
        </div>
      </article>
    )}
    </>
  );
}
