"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LinkIcon } from "../icons";
import { sourceLabel } from "./sources";

const PILL =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150";

const PILL_STYLE: CSSProperties = {
  borderColor: "rgba(255,255,255,0.28)",
  color: "rgba(255,255,255,0.85)",
  background: "rgba(255,255,255,0.06)",
};

// One source → a single labelled pill. Several → a round trigger that bounces
// the individual source pills up into view.
export function SourceLinks({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Motion listens for the card's drag on pointerdown in the bubble phase.
  // Stopping these events at the source island lets the link click through
  // without also starting a card drag or flip.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const swallow = (e: Event) => e.stopPropagation();
    const events = ["pointerdown", "pointerup", "mousedown", "touchstart"];
    events.forEach((name) => el.addEventListener(name, swallow));
    return () => events.forEach((name) => el.removeEventListener(name, swallow));
  }, [open]);

  if (sources.length === 0) return null;

  if (sources.length === 1) {
    return (
      <div ref={rootRef} className="mt-auto flex justify-center pt-4" style={{ position: "relative", zIndex: 10000 }}>
        <a href={sources[0]} target="_blank" rel="noopener noreferrer" className={PILL} style={PILL_STYLE}>
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
      {/* Overlays the finding text instead of pushing layout, so long findings never collide with it. */}
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
                className={PILL}
                style={PILL_STYLE}
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
