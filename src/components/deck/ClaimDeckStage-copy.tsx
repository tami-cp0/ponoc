"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import type { Card } from "../../lib/types";
import { ClaimCardMonolith } from "../cards/ClaimCardMonolith-copy";
import { SessionsGrid, type LogBox } from "./SessionsGrid";
import { FrequencyVisualizer } from "./FrequencyVisualizer";

const SWIPE_THRESHOLD = 90;
const VISIBLE_STACK = 4;

// Controls "split + rise" simulation. The visualizer is taller than the buttons
// and rises from the fabric in the gap once they've parted.
const VIZ_W = 168;
const VIZ_H = 82;
const CTRL_GAP = 12;
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const throwLeft = {
  // The intentionally-removed top card is thrown cleanly off to the left.
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
  // Cards pushed out the back of the visible window just fade out in place.
  vanish: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

interface Props {
  // Live claim stream (source of truth for claims + their verdicts).
  cards: Card[];
  // Live session controls (omitted on the standalone demo page).
  running?: boolean;
  onToggle?: () => void;
  // Demo-only extra control shown in the pill.
  onAddDemoClaim?: () => void;
  // Live mic analyser accessor for the visualizer (null when no session runs).
  getAnalyser?: () => AnalyserNode | null;
}

export function ClaimDeckStage({ cards, running: liveRunning, onToggle, onAddDemoClaim, getAnalyser }: Props) {
  const [deck, setDeck] = useState<Card[]>([]);
  // Current-session retrieval stack (a single start→stop cycle).
  const [session, setSession] = useState<Card[]>([]);
  // Every verdict box ever — the permanent bottom grid. Survives reset.
  const [log, setLog] = useState<LogBox[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);
  // Claim ids the deck has already taken in, so a card thrown to session or
  // dropped is never re-added when the live stream re-renders.
  const seenIds = useRef<Set<string>>(new Set());

  // Use live controls when provided, else the local demo toggle.
  const running = onToggle ? Boolean(liveRunning) : demoRunning;
  const toggle = onToggle ?? (() => setDemoRunning((r) => !r));

  // Sync the live claim stream into local state: brand-new claims queue at the
  // back of the deck; status changes (verifying→verdict) update in place
  // wherever the card currently lives (deck or session).
  useEffect(() => {
    const fresh: Card[] = [];
    const byId = new Map(cards.map((c) => [c.id, c]));

    // cards[0] is the newest (the live stream prepends). Walk oldest→newest so
    // fresh claims queue at the back of the deck in arrival order.
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      if (!seenIds.current.has(c.id)) {
        seenIds.current.add(c.id);
        fresh.push(c);
      }
    }

    setDeck((d) => {
      const updated = d.map((c) => byId.get(c.id) ?? c);
      return [...updated, ...fresh];
    });
    setSession((s) => s.map((c) => byId.get(c.id) ?? c));
  }, [cards]);

  // A box appears the instant a claim reaches a verdict — independent of
  // swiping. Each verdict is logged once and stays forever.
  useEffect(() => {
    const settled = cards.filter((c) => c.status === "true" || c.status === "false");
    if (settled.length === 0) return;
    setLog((l) => {
      const seen = new Set(l.map((b) => b.claimId));
      const added = settled
        .filter((c) => !seen.has(c.id))
        .map((c) => ({ id: `${c.id}-box`, claimId: c.id, status: c.status }));
      return added.length ? [...l, ...added] : l;
    });
  }, [cards]);

  const current = deck[0] ?? null;
  // Only the intentionally-removed top card plays the throw-left exit; cards
  // pushed out the back of the visible window on retrieve just disappear.
  const [throwingId, setThrowingId] = useState<string | null>(null);
  // Which card (by id) is currently turned around to its finding. Only the top
  // card can flip; cleared whenever a card leaves the top so a card returning
  // from the session never comes back stuck facing its back.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  // Card ids whose reveal animation has fully finished (verdict shown). Only
  // these have a back face, so only these may be flipped — a swipe-up on a card
  // still blinking/bleeding does nothing but the swipe itself.
  const readyIds = useRef<Set<string>>(new Set());

  // Live drag of the top card. `x`/`y` are the drag offset in px; `lift` eases
  // 0→1 while the card is held. Everything about the shadow derives from these.
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const lift = useMotionValue(0);

  // How far the card has been pulled from home (px), used to grow the shadow.
  const dist = useTransform<number, number>(
    [dragX, dragY],
    ([x, y]) => Math.hypot(x, y),
  );

  // Cast shadow, modelled as light from top-front: the shadow is the card's
  // silhouette projected onto everything behind it. At rest it sits directly
  // under the card (offset ~0, hidden). As the card lifts and moves, the shadow
  // slides out the OPPOSITE diagonal, and grows softer/wider the further it goes.
  // drop-shadow (not box-shadow) follows the card's real rounded silhouette.
  const shadow = useTransform(() => {
    const l = lift.get(); // 0 at rest, ~1 held
    const x = dragX.get();
    const y = dragY.get();
    const d = dist.get();
    // Dynamic lift shadow — unchanged from the original: ~nothing at rest,
    // sliding and deepening opposite the drag as the card lifts and moves.
    const ox = -x * 0.18 * l;
    const oy = -y * 0.18 * l + 8 * l;
    const blur = (8 + d * 0.12) * l + 3 * l;
    const alpha = Math.min(0.7, (0.5 + d * 0.0012) * l);
    // A constant resting ground shadow so the stack looks seated at rest. It is
    // chained separately and fades out as the card lifts (× (1 - l)).
    const restAlpha = 0.45 * (1 - l);
    // Offset well past the card edge (not tucked under it) so the resting shadow
    // is actually visible on the valley floor, not just a sliver at the bottom.
    return `drop-shadow(0 16px 20px rgba(12,12,18,${restAlpha.toFixed(3)})) drop-shadow(${ox.toFixed(1)}px ${oy.toFixed(1)}px ${blur.toFixed(1)}px rgba(12,12,18,${alpha.toFixed(3)}))`;
  });

  // Tilt the card toward the drag like a held object catching the light.
  // tiltY responds to horizontal drag, rotateX (inverted) to vertical.
  const tiltY = useTransform(dragX, [-160, 160], [-10, 10], { clamp: true });
  const rotateX = useTransform(dragY, [-160, 160], [8, -8], { clamp: true });
  // A swipe-up (or the on-card button) turns the whole card around: `flip`
  // animates 0↔180 and adds onto the live drag tilt, so the physical card spins
  // horizontally while still catching the drag lean.
  const flip = useMotionValue(0);
  const rotateY = useTransform(() => tiltY.get() + flip.get());

  // A card can only turn around once its reveal has fully finished (the card
  // reports readiness) and it has a finding on the back to show. While it is
  // still pending (blinking/bleeding) there is no back face, so a swipe-up must
  // do nothing but the swipe itself.
  const canFlip = (c: Card | null): boolean =>
    !!c && readyIds.current.has(c.id) && Boolean(c.reasoning);

  // Turn the top card around to its finding (or back).
  const toggleFlip = () => {
    if (!canFlip(current)) return;
    const next = flippedId === current!.id ? null : current!.id;
    setFlippedId(next);
    animate(flip, next ? 180 : 0, { type: "spring", stiffness: 260, damping: 30 });
  };

  const sendToSessions = () => {
    if (!current) return;
    // A card thrown to the session leaves facing its verdict again.
    setFlippedId(null);
    flip.set(0);
    setThrowingId(current.id);
    setDeck((d) => d.slice(1));
    setSession((s) => [current, ...s]);
    // Clear once the throw exit has finished, so this id can never trigger a
    // stray throw animation on a later exit (e.g. after being retrieved).
    window.setTimeout(() => setThrowingId((id) => (id === current.id ? null : id)), 400);
  };

  const retrieve = () => {
    if (session.length === 0) return;
    // dragX/dragY/lift are shared by whichever card is on top. The retrieved
    // card becomes the new top; snap these home first so it lands on the deck
    // instead of inheriting the offset frozen where the swipe was released.
    dragX.set(0);
    dragY.set(0);
    lift.set(0);
    // The incoming card must land facing its verdict, not mid-spin.
    setFlippedId(null);
    flip.set(0);
    setThrowingId(null);
    const [first, ...rest] = session;
    setSession(rest);
    setDeck((d) => [first, ...d]);
  };

  const reset = () => {
    setDeck([]);
    setSession([]);
    seenIds.current = new Set();
    // The all-time grid persists across resets.
  };

  const onDragStart = () => {
    // Ease the card up off the surface; the shadow grows in as lift rises.
    animate(lift, 1, { duration: 0.22, ease: "easeOut" });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Settle back down; the shadow shrinks away as the card drops home or leaves.
    animate(lift, 0, { duration: 0.3, ease: "easeOut" });
    const { x, y } = info.offset;
    // Horizontal intent wins on a diagonal so a store/retrieve is never mistaken
    // for a spin; only a predominantly-upward swipe turns the card around.
    if (Math.abs(x) > Math.abs(y)) {
      if (x < -SWIPE_THRESHOLD) sendToSessions();
      else if (x > SWIPE_THRESHOLD) retrieve();
    } else if (y < -SWIPE_THRESHOLD) {
      toggleFlip();
    }
  };

  return (
    <div className="stage">
      {/* Layer 3: controls — Start + Reset joined when stopped. On start they part
          (inner sides slope back into the fabric) and a taller visualizer rises
          from the fabric between them. Start is local-only here (no onToggle), so
          it never opens the live connection — this is a simulation. */}
      <div className="stage-controls">
        <motion.button
          className="pill-btn ctrl-start"
          onClick={toggle}
          data-running={running}
          initial={false}
          animate={{
            borderTopRightRadius: running ? 999 : 0,
            borderBottomRightRadius: running ? 999 : 0,
          }}
          transition={running ? { duration: 0.22, ease: EASE } : { duration: 0.22, ease: EASE, delay: 0.14 }}
        >
          {running ? "Stop" : "Start"}
        </motion.button>

        <motion.div
          className="ctrl-viz"
          style={{ height: VIZ_H }} /* always full height — a 3D component, never flat */
          initial={false}
          animate={{
            width: running ? VIZ_W : 0,
            marginLeft: running ? CTRL_GAP : 0,
            marginRight: running ? CTRL_GAP : 0,
            scale: running ? 1 : 0.6,
            opacity: running ? 1 : 0,
            y: running ? 0 : 14,
          }}
          transition={
            running
              ? {
                  // Phase 1 (snappy): open the gap. Phase 2 (delayed, slower): the
                  // 3D component rises/emerges gracefully.
                  width: { duration: 0.22, ease: EASE },
                  marginLeft: { duration: 0.22, ease: EASE },
                  marginRight: { duration: 0.22, ease: EASE },
                  scale: { duration: 0.55, ease: EASE, delay: 0.16 },
                  opacity: { duration: 0.4, delay: 0.16 },
                  y: { duration: 0.55, ease: EASE, delay: 0.16 },
                }
              : {
                  // Phase 1: it sinks back. Phase 2 (delayed): close the gap.
                  scale: { duration: 0.4, ease: EASE },
                  opacity: { duration: 0.3 },
                  y: { duration: 0.4, ease: EASE },
                  width: { duration: 0.22, ease: EASE, delay: 0.3 },
                  marginLeft: { duration: 0.22, ease: EASE, delay: 0.3 },
                  marginRight: { duration: 0.22, ease: EASE, delay: 0.3 },
                }
          }
          aria-hidden={!running}
        >
          <FrequencyVisualizer active={running} getAnalyser={getAnalyser ?? (() => null)} />
        </motion.div>

        <motion.button
          className="pill-btn ctrl-reset"
          onClick={reset}
          initial={false}
          animate={{
            borderTopLeftRadius: running ? 999 : 0,
            borderBottomLeftRadius: running ? 999 : 0,
          }}
          transition={running ? { duration: 0.22, ease: EASE } : { duration: 0.22, ease: EASE, delay: 0.14 }}
        >
          reset
        </motion.button>
      </div>

      {/* Standalone demo control, detached from the pill */}
      {onAddDemoClaim && (
        <button className="stage-demo-claim" onClick={onAddDemoClaim}>+ claim</button>
      )}

      {/* Layer 2: the deck, centered */}
      <div className="stage-deck">
        <button className="deck-nav" onClick={retrieve} disabled={session.length === 0} aria-label="Retrieve">
          <Chevron dir="left" />
        </button>

        <div
          className="deck-viewport"
          style={{ perspective: 1200 }}
        >
          <AnimatePresence initial={false}>
            {deck
              .slice(0, VISIBLE_STACK)
              .map((card, i) => {
                const isTop = i === 0;
                // Behind cards fade their contact shadow with depth so a tall
                // stack doesn't pile many full shadows into one dark blob at the
                // fanned edge. The top card casts the live drag shadow (filter)
                // instead. Inline, so it overrides the shared .deck-card CSS for
                // this deck only.
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
                      // Only the top card carries the live cast shadow (its
                      // silhouette) and drag tilt. A demoted card must explicitly
                      // reset filter to "none" — otherwise the drop-shadow lingers
                      // in the DOM and piles onto the stack on every retrieve.
                      // NOTE: `filter` flattens 3D, so the spin/tilt live on an
                      // inner preserve-3d wrapper below — never on this element.
                      filter: isTop ? shadow : "none",
                      ...(isTop
                        ? {
                            x: dragX,
                            y: dragY,
                          }
                        : null),
                    }}
                    initial={{ opacity: 0, x: -60, rotate: -8, scale: 0.96 }}
                    // y:0 gives the vertical axis a home. The top card overrides
                    // it with style y:dragY while held; once a card stops being
                    // top (e.g. on retrieve) it returns y to the deck instead of
                    // sticking at the height the swipe was released.
                    animate={{ rotate: i * 3, x: 0, y: 0, scale: 1, opacity: 1 }}
                    variants={throwLeft}
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
                    {/* Inner 3D wrapper: owns the tilt + the flip. It carries
                        preserve-3d so the card's two faces (front verdict / back
                        finding) sit in real 3D space, and its own perspective so
                        the spin has depth — the outer card can't provide either,
                        because its cast-shadow `filter` flattens 3D. */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        borderRadius: "inherit",
                        transformStyle: "preserve-3d",
                        transformPerspective: 1200,
                        ...(isTop ? { rotateX, rotateY } : null),
                      }}
                    >
                      <ClaimCardMonolith
                        card={card}
                        onDismiss={() => {}}
                        onVerdictReady={() => readyIds.current.add(card.id)}
                        {...(isTop ? { flipped: flippedId === card.id, onToggleFlip: toggleFlip } : null)}
                      />
                    </motion.div>
                  </motion.div>
                );
              })
              .reverse()}
          </AnimatePresence>

          {deck.length === 0 && <div className="deck-empty">No claims</div>}
        </div>

        <button className="deck-nav" onClick={sendToSessions} disabled={!current} aria-label="Store">
          <Chevron dir="right" />
        </button>
      </div>

      {/* Layer 1: all-time sessions grid, anchored to the bottom */}
      <SessionsGrid boxes={log} />
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M17 6L9 14l8 8" : "M11 6l8 8-8 8"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
