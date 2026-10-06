"use client";

import { useState } from "react";
import { animate, motion, type PanInfo } from "motion/react";
import type { Card } from "@/shared/protocol";
import { ClaimCard } from "../card/ClaimCard";
import { FLIP_SPRING, SWIPE_THRESHOLD, useCardDrag } from "../deck/useCardDrag";

export function ShowcaseCard({ card }: { card: Card }) {
  const { dragX, dragY, flip, rotateX, rotateY } = useCardDrag();
  const [flipped, setFlipped] = useState(false);

  const toggleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    animate(flip, next ? 180 : 0, FLIP_SPRING);
  };

  // Same gesture as the deck: a mostly-upward swipe turns the card around.
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { x, y } = info.offset;
    if (Math.abs(y) > Math.abs(x) && y < -SWIPE_THRESHOLD) toggleFlip();
  };

  return (
    <div className="lp-showcase deck-page-3d reveal">
      <motion.div
        className="deck-card"
        style={{ x: dragX, y: dragY, transformOrigin: "center" }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.28}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 34 }}
        onDragEnd={onDragEnd}
        whileDrag={{ cursor: "grabbing" }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            borderRadius: "inherit",
            transformStyle: "preserve-3d",
            transformPerspective: 1200,
            rotateX,
            rotateY,
          }}
        >
          <ClaimCard card={card} flipped={flipped} onToggleFlip={toggleFlip} />
        </motion.div>
      </motion.div>
    </div>
  );
}
