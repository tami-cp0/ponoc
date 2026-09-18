"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
                className="verdict-back group flex w-full items-center gap-2.5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
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
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="transition-transform duration-200 group-hover:-translate-x-0.5"
                  aria-hidden
                >
                  <path d="M11.5 5L6.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                The verdict
              </button>
              <div className="flex flex-1 flex-col">
                <p className="mt-3 font-expose text-md leading-[1.62]" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {card.reasoning}
                </p>
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
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {settled && <span className="slab-grain" aria-hidden />}
        <div className="face relative z-20 flex h-full flex-col">
          <button
            onClick={() => toggleFinding(false)}
            className="verdict-back group flex w-full items-center gap-2.5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
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
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden
            >
              <path d="M11.5 5L6.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            The verdict
          </button>
          <div className="flex flex-1 flex-col">
            <p className="mt-3 font-expose text-md leading-[1.62]" style={{ color: "rgba(255,255,255,0.9)" }}>
              {card.reasoning}
            </p>
          </div>
        </div>
      </article>
    )}
    </>
  );
}
