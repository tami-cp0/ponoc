"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, type PanInfo } from "motion/react";
import type { Card } from "@/shared/protocol";
import { ClaimCard } from "../card/ClaimCard";
import { ChevronIcon } from "../icons";
import { DeckControls } from "./DeckControls";
import { VerdictGrid, type VerdictBox } from "./VerdictGrid";
import { useCardDrag } from "./useCardDrag";

const SWIPE_THRESHOLD = 90;
const VISIBLE_STACK = 4;

const exitVariants = {
  // The top card, removed on purpose, is thrown off to the left.
  gone: {
    x: -460,
    y: 12,
    rotate: -10,
    opacity: 0,
    transition: {
      x: { duration: 0.32, ease: [0.36, 0, 0.66, -0.2] as [number, number, number, number] },
      rotate: { duration: 0.32, ease: "easeIn" as const },
      opacity: { duration: 0.32, ease: "easeIn" as const },
    },
  },
  // Cards pushed out of the back of the visible stack just fade.
  vanish: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

interface Props {
  cards: Card[];
  running: boolean;
  connecting: boolean;
  // Every past verdict, oldest first (true = TRUE).
  verdictHistory: boolean[];
  onToggle: () => void;
  getAnalyser: () => AnalyserNode | null;
}

// Three piles: the deck (unread claims, top card first), the session stack
// (cards swiped away, retrievable), and the verdict grid (every verdict from
// every session, kept through resets).
export function ClaimDeck({ cards, running, connecting, verdictHistory, onToggle, getAnalyser }: Props) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [session, setSession] = useState<Card[]>([]);
  const [verdicts, setVerdicts] = useState<VerdictBox[]>(() =>
    verdictHistory.map((isTrue, i) => ({ id: `past-${i}`, claimId: `past-${i}`, status: isTrue ? "true" : "false" })),
  );
  // Ids ever taken into the deck. Kept through resets, so cleared cards never come back.
  const [seenIds, setSeenIds] = useState(new Set<string>());
  const [syncedCards, setSyncedCards] = useState<Card[]>([]);

  // When the claim stream changes: new claims join the back of the deck, status
  // changes update a card in place wherever it is, and every new verdict gets a
  // box. Done during render (React's pattern for adjusting state to a changed
  // prop) rather than in an effect, which would render twice.
  if (cards !== syncedCards) {
    setSyncedCards(cards);
    const byId = new Map(cards.map((c) => [c.id, c]));
    // cards is newest-first; reverse so fresh claims queue in arrival order.
    const fresh = cards.filter((c) => !seenIds.has(c.id)).reverse();
    if (fresh.length) setSeenIds(new Set([...seenIds, ...fresh.map((c) => c.id)]));
    setDeck((d) => [...d.map((c) => byId.get(c.id) ?? c), ...fresh]);
    setSession((s) => s.map((c) => byId.get(c.id) ?? c));
    setVerdicts((boxes) => {
      const logged = new Set(boxes.map((b) => b.claimId));
      const added = cards
        .filter((c) => (c.status === "true" || c.status === "false") && !logged.has(c.id))
        .map((c) => ({ id: `${c.id}-box`, claimId: c.id, status: c.status }));
      return added.length ? [...boxes, ...added] : boxes;
    });
  }

  const current = deck[0] ?? null;
  const [throwingId, setThrowingId] = useState<string | null>(null);
  // Only the top card can be turned around; cleared whenever a card leaves the top.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  // Cards whose reveal has finished. Only these have a back face to flip to.
  const readyIds = useRef(new Set<string>());
  const { dragX, dragY, lift, flip, shadow, rotateX, rotateY } = useCardDrag();

  const toggleFlip = () => {
    if (!current || !readyIds.current.has(current.id) || !current.reasoning) return;
    const next = flippedId === current.id ? null : current.id;
    setFlippedId(next);
    animate(flip, next ? 180 : 0, { type: "spring", stiffness: 260, damping: 30 });
  };

  const faceFront = () => {
    setFlippedId(null);
    flip.set(0);
  };

  const sendToSession = () => {
    if (!current) return;
    faceFront();
    setThrowingId(current.id);
    setDeck((d) => d.slice(1));
    setSession((s) => [current, ...s]);
    // Clear after the throw, so a later exit of this card (after retrieval) doesn't replay it.
    window.setTimeout(() => setThrowingId((id) => (id === current.id ? null : id)), 400);
  };

  const retrieve = () => {
    if (session.length === 0) return;
    // The drag values belong to whichever card is on top. Reset them so the
    // retrieved card lands home instead of where the last swipe let go.
    dragX.set(0);
    dragY.set(0);
    lift.set(0);
    faceFront();
    setThrowingId(null);
    const [first, ...rest] = session;
    setSession(rest);
    setDeck((d) => [first, ...d]);
  };

  const reset = () => {
    setDeck([]);
    setSession([]);
  };

  const onDragStart = () => {
    animate(lift, 1, { duration: 0.22, ease: "easeOut" });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    animate(lift, 0, { duration: 0.3, ease: "easeOut" });
    const { x, y } = info.offset;
    // Horizontal wins on a diagonal, so a store/retrieve is never read as a flip.
    if (Math.abs(x) > Math.abs(y)) {
      if (x < -SWIPE_THRESHOLD) sendToSession();
      else if (x > SWIPE_THRESHOLD) retrieve();
    } else if (y < -SWIPE_THRESHOLD) {
      toggleFlip();
    }
  };

  return (
    <div className="stage">
      <DeckControls
        running={running}
        connecting={connecting}
        onToggle={onToggle}
        onReset={reset}
        getAnalyser={getAnalyser}
      />

      <div className="stage-deck">
        <button className="deck-nav" onClick={retrieve} disabled={session.length === 0} aria-label="Retrieve">
          <ChevronIcon dir="left" />
        </button>

        <div className="deck-viewport" style={{ perspective: 1200 }}>
          <AnimatePresence initial={false}>
            {deck
              .slice(0, VISIBLE_STACK)
              .map((card, i) => {
                const isTop = i === 0;
                // Cards behind fade their contact shadow with depth, so a tall
                // stack doesn't pile up into one dark blob at the fanned edge.
                const depthShadow = isTop
                  ? undefined
                  : `0 ${i * 4}px ${8 + i * 3}px -6px rgba(20, 20, 20, ${(0.18 - i * 0.04).toFixed(2)})`;
                return (
                  <motion.div
                    key={card.id}
                    className="deck-card"
                    data-behind={!isTop}
                    style={{
                      zIndex: VISIBLE_STACK - i,
                      transformOrigin: "center",
                      boxShadow: depthShadow,
                      // A demoted card must reset filter explicitly, or its drop-shadow
                      // lingers and piles onto the stack. `filter` also flattens 3D,
                      // which is why the tilt and spin live on the inner wrapper.
                      filter: isTop ? shadow : "none",
                      ...(isTop ? { x: dragX, y: dragY } : null),
                    }}
                    initial={{ opacity: 0, x: -60, rotate: -8, scale: 0.96 }}
                    // y: 0 returns a card to the deck once it stops being on top.
                    animate={{ rotate: i * 3, x: 0, y: 0, scale: 1, opacity: 1 }}
                    variants={exitVariants}
                    exit={card.id === throwingId ? "gone" : "vanish"}
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                    drag={isTop}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.28}
                    dragTransition={{ bounceStiffness: 500, bounceDamping: 34 }}
                    onDragStart={isTop ? onDragStart : undefined}
                    onDragEnd={isTop ? onDragEnd : undefined}
                    whileDrag={{ cursor: "grabbing" }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        borderRadius: "inherit",
                        transformStyle: "preserve-3d",
                        transformPerspective: 1200,
                        ...(isTop ? { rotateX, rotateY } : null),
                      }}
                    >
                      <ClaimCard
                        card={card}
                        onVerdictReady={() => readyIds.current.add(card.id)}
                        {...(isTop ? { flipped: flippedId === card.id, onToggleFlip: toggleFlip } : null)}
                      />
                    </motion.div>
                  </motion.div>
                );
              })
              .reverse()}
          </AnimatePresence>

          {deck.length === 0 && <div className="deck-empty font-array">No claims</div>}
        </div>

        <button className="deck-nav" onClick={sendToSession} disabled={!current} aria-label="Store">
          <ChevronIcon dir="right" />
        </button>
      </div>

      <VerdictGrid boxes={verdicts} />
    </div>
  );
}
