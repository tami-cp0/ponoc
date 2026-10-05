"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import type { Card } from "@/shared/protocol";
import { ClaimCard } from "../card/ClaimCard";

export function ShowcaseCard({ card }: { card: Card }) {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const tiltY = useTransform(dragX, [-160, 160], [-10, 10], { clamp: true });
  const rotateX = useTransform(dragY, [-160, 160], [8, -8], { clamp: true });

  return (
    <div className="lp-showcase deck-page-3d reveal">
      <motion.div
        className="deck-card"
        style={{ x: dragX, y: dragY, transformOrigin: "center" }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.28}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 34 }}
        whileDrag={{ cursor: "grabbing" }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            borderRadius: "inherit",
            transformStyle: "preserve-3d",
            transformPerspective: 1200,
            rotateX,
            rotateY: tiltY,
          }}
        >
          <ClaimCard card={card} />
        </motion.div>
      </motion.div>
    </div>
  );
}
