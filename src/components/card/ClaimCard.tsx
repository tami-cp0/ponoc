"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "@/shared/protocol";
import { BLEED_DURATION, CELL_FADE, CellGrid, useCells, type Phase } from "./CellGrid";
import { FindingFace } from "./FindingFace";
import { VerdictFace } from "./VerdictFace";
import { extractSources } from "@/shared/sources";

const VERDICT = {
  true: { word: "TRUE", base: "#1C5334", deep: "#0F3F25" },
  false: { word: "FALSE", base: "#8E1A1A", deep: "#6E1111" },
} as const;

const ARTICLE = "absolute inset-0 flex flex-col overflow-hidden px-7 pt-6 pb-6";
const FACE = "face relative z-20 flex h-full flex-col";
// About when the deck's flip spring passes 90°, so each side vanishes as it turns away.
const HALF_TURN = "visibility 0s linear 100ms";

interface Props {
  card: Card;
  // In the deck, the deck owns the physical 3D spin and controls the flip.
  // Without these (the landing showcase) the card swaps its front face itself.
  flipped?: boolean;
  onToggleFlip?: () => void;
  // Fires once the reveal has finished, i.e. once there is a back face to flip to.
  onVerdictReady?: () => void;
}

export function ClaimCard({ card, flipped, onToggleFlip, onVerdictReady }: Props) {
  const settled = card.status === "true" || card.status === "false";
  const v = card.status === "true" || card.status === "false" ? VERDICT[card.status] : null;

  const controlled = onToggleFlip !== undefined;
  const [localFinding, setLocalFinding] = useState(false);
  const showFinding = controlled ? Boolean(flipped) : localFinding;
  const toggleFinding = (next: boolean) => {
    if (onToggleFlip) onToggleFlip();
    else setLocalFinding(next);
  };

  const [phase, setPhase] = useState<Phase>(settled ? "verdict" : "blinking");
  const articleRef = useRef<HTMLElement>(null);
  const cells = useCells(articleRef);
  const mountedUnsettled = useRef(!settled);

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

  useEffect(() => {
    if (phase === "verdict" && settled) onVerdictReady?.();
  }, [phase, settled, onVerdictReady]);

  const surface =
    v && phase === "verdict" ? `radial-gradient(120% 90% at 20% 0%, ${v.base} 0%, ${v.deep} 78%)` : "var(--bg)";

  const extracted = card.reasoning ? extractSources(card.reasoning) : { text: "", urls: [] };
  const findingSources = [...new Set([...(card.sources ?? []), ...extracted.urls])];
  const hasFinding = Boolean(card.reasoning);
  const showVerdict = phase === "verdict" && settled;
  const frontFinding = !controlled && showFinding && hasFinding;
  const showBackFace = controlled && showVerdict && hasFinding;

  const finding = (
    <FindingFace text={extracted.text} sources={findingSources} onBack={() => toggleFinding(false)} />
  );

  return (
    <>
      <article
        ref={articleRef}
        className={ARTICLE}
        style={{
          background: surface,
          containerType: phase === "verdict" ? "inline-size" : "normal",
          backfaceVisibility: controlled ? "hidden" : undefined,
          WebkitBackfaceVisibility: controlled ? "hidden" : undefined,
          borderRadius: controlled ? "inherit" : undefined,
          // backface-visibility alone lets composited children (the face's
          // entry animation, the stamp) bleed through, so hide the side that is
          // turned away too. It is also still hit-testable without this.
          visibility: controlled && showFinding ? "hidden" : "visible",
          transition: controlled ? HALF_TURN : undefined,
          pointerEvents: controlled && showFinding ? "none" : undefined,
        }}
      >
        {settled && <span className="slab-grain" aria-hidden />}

        {phase !== "verdict" && <CellGrid cells={cells} phase={phase} verdictColor={v ? v.base : null} />}

        {showVerdict &&
          (frontFinding ? (
            <div key="finding" className={FACE} onClick={(e) => e.stopPropagation()}>
              {finding}
            </div>
          ) : (
            <div key="verdict" className={FACE} onClick={(e) => e.stopPropagation()}>
              <VerdictFace
                claim={card.claim}
                word={v!.word}
                onShowFinding={hasFinding ? () => toggleFinding(true) : null}
              />
            </div>
          ))}
      </article>

      {/* Pre-rotated 180° in the deck card's 3D space, so it reads correctly once the whole card spins around. */}
      {showBackFace && (
        <article
          className={ARTICLE}
          style={{
            background: surface,
            containerType: "inline-size",
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: "inherit",
            visibility: showFinding ? "visible" : "hidden",
            transition: HALF_TURN,
            pointerEvents: showFinding ? undefined : "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="slab-grain" aria-hidden />
          <div className={FACE}>{finding}</div>
        </article>
      )}
    </>
  );
}
