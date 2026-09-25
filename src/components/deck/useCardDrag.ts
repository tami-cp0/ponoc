import { useMotionValue, useTransform } from "motion/react";

// Motion values for the top card. dragX/dragY are the drag offset in px, lift
// eases 0→1 while the card is held, flip animates 0↔180 when it turns around.
export function useCardDrag() {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const lift = useMotionValue(0);
  const flip = useMotionValue(0);

  // Light from the top-front: as the card lifts and moves, its shadow slides the
  // opposite way and grows softer the further it goes. A separate resting
  // shadow keeps the stack seated and fades out as the card lifts. drop-shadow
  // (not box-shadow) follows the card's rounded silhouette.
  const shadow = useTransform(() => {
    const l = lift.get();
    const x = dragX.get();
    const y = dragY.get();
    const d = Math.hypot(x, y);
    const ox = -x * 0.18 * l;
    const oy = -y * 0.18 * l + 8 * l;
    const blur = (8 + d * 0.12) * l + 3 * l;
    const alpha = Math.min(0.7, (0.5 + d * 0.0012) * l);
    const restAlpha = 0.45 * (1 - l);
    return `drop-shadow(0 16px 20px rgba(12,12,18,${restAlpha.toFixed(3)})) drop-shadow(${ox.toFixed(1)}px ${oy.toFixed(1)}px ${blur.toFixed(1)}px rgba(12,12,18,${alpha.toFixed(3)}))`;
  });

  // Tilt toward the drag like a held object; the flip adds onto the tilt.
  const tiltY = useTransform(dragX, [-160, 160], [-10, 10], { clamp: true });
  const rotateX = useTransform(dragY, [-160, 160], [8, -8], { clamp: true });
  const rotateY = useTransform(() => tiltY.get() + flip.get());

  return { dragX, dragY, lift, flip, shadow, rotateX, rotateY };
}
