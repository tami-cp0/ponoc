"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ClaimCardMonolith } from "../components/cards/ClaimCardMonolith-copy";
import type { Card } from "../lib/types";

// ── Contribution grid ──────────────────────────────────────────────────────
// The deck's exact .grid-box blocks, coloured by verdict. A seeded PRNG keeps
// SSR and the first client render identical (no hydration mismatch). Flicker +
// sheen live in CSS.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID_ROWS = 7;
const BOX = 12;
const GAP = 3;
const STEP = BOX + GAP;
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

function ShimmerGrid() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(48);

  // Fill the container: measure the block row's width and lay down as many
  // columns as fit, so the grid spans the full inner width (inside the lip).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setCols(Math.max(1, Math.floor(w / STEP)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo(() => {
    const rand = mulberry32(20260919);
    return Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: cols }, () => ({
        color: boxColor(rand),
        delay: rand() * 6,
        duration: 5 + rand() * 3,
      })),
    );
  }, [cols]);

  return (
    <div className="lp-grid-frame">
      <div className="lp-grid-rows" ref={trackRef} aria-hidden>
        {rows.map((row, r) => (
          <div className="lp-grid-row" key={r}>
            {row.map((cell, c) => (
              <div
                key={c}
                className="grid-box"
                style={{
                  width: BOX,
                  height: BOX,
                  margin: GAP / 2,
                  backgroundColor: cell.color,
                  animationDelay: `${cell.delay}s`,
                  animationDuration: `${cell.duration}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="lp-grid-sheen" aria-hidden />
    </div>
  );
}

// A settled FALSE card, the exact shape the deck feeds ClaimCardMonolith.
// (Claim length is normalised across both showcase cards via .lp-showcase CSS so
// the verdict stamp sits at the same height regardless of the text.)
const SHOWCASE_FALSE: Card = {
  id: "showcase-false",
  claim: "We only use ten percent of our brains.",
  status: "false",
  reasoning:
    "Brain scans show we use virtually every part of the brain, and most of it is active almost all the time ([scientificamerican.com](https://www.scientificamerican.com/article/do-we-only-use-10-percent-of-our-brains/)).",
  backgrounded: false,
};

// The TRUE clone — only the colour and verdict change (both come from `status`).
const SHOWCASE_TRUE: Card = {
  id: "showcase-true",
  claim: "A banana is a berry, but a strawberry is not.",
  status: "true",
  reasoning:
    "Botanically a banana fits the definition of a berry, while a strawberry does not ([sciencefocus.com](https://www.sciencefocus.com/nature/is-a-banana-a-berry)).",
  backgrounded: false,
};

// ── The showcase card — the REAL deck card and the REAL drag from /main. This is
// the exact ClaimCardMonolith wrapped in ClaimDeckStage's drag mechanism (motion
// `drag`, elastic snap-back, tilt on an inner preserve-3d wrapper). No reinvention.
function ShowcaseCard({ card }: { card: Card }) {
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
          <ClaimCardMonolith card={card} onDismiss={() => {}} />
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────
function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 7h8M7.5 3.5L11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


const FEATURES = [
  {
    title: "Hears the claim",
    desc: "It listens to your voice and catches what can be checked.",
  },
  {
    title: "Checks the source",
    desc: "It looks it up and shows the evidence.",
  },
  {
    title: "Says true or false",
    desc: "It settles the claim on the spot, while it still matters.",
  },
];

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Scroll reveal — one IntersectionObserver over every .reveal element.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      {/* ── HERO — full-viewport rounded panel, top-centre nav, bottom content ── */}
      <div className="lp-hero-wrap">
        <div className="lp-hero">
          <nav className="lp-nav">
            <Link href="/main">Login</Link>
            <a href="#product">Product</a>
            <a href="#connect">Connect</a>
            <Link href="/main">Open deck</Link>
          </nav>

          <div className="lp-hero-content">
            <div className="lp-hero-grid">
              <div className="lp-hero-head">
                <h1 className="lp-hero-title font-bebas reveal">PONOC.</h1>
              </div>
              <div className="lp-hero-aside reveal">
                <p className="lp-hero-lede">
                  ponoc is a realtime claim validator. It listens, verifies what it hears, and
                  tells you whether each claim is true or false, live.
                </p>
                <Link href="/main" className="lp-cta lp-cta-hero">
                  Start listening
                  <ArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MANIFESTO ─────────────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-manifesto reveal">
          <h2 className="lp-manifesto-statement font-array-wide">
            A conversation moves fast.{" "}
            <span className="lp-accent font-bebas">The truth</span> should keep up.
          </h2>
        </div>
      </section>

      {/* ── PRODUCT ───────────────────────────────────────────────────────── */}
      <section className="lp-section" id="product">
        <div className="lp-container">
          <div className="lp-product-head reveal">
            <h2 className="lp-product-title font-array-wide">
              From spoken word
              <br />
              <span className="lp-product-title-soft">to settled verdict.</span>
            </h2>
          </div>

          <div className="lp-product-grid">
            <ShowcaseCard card={SHOWCASE_FALSE} />
            <div className="lp-flow reveal">
              {FEATURES.map((f) => (
                <div className="lp-step" key={f.title}>
                  <span className="lp-step-node" />
                  <h3 className="lp-step-title font-array-wide">{f.title}</h3>
                  <p className="lp-step-desc">{f.desc}</p>
                </div>
              ))}
            </div>
            <ShowcaseCard card={SHOWCASE_TRUE} />
          </div>
        </div>
      </section>

      {/* ── HISTORY (shimmer grid) ────────────────────────────────────────── */}
      <section className="lp-section" id="history">
        <div className="lp-container">
          <div className="lp-history-head reveal">
            <span className="lp-label">Every verdict</span>
            <h2 className="lp-product-title font-array-wide">Since day one.</h2>
          </div>
          <div className="reveal">
            <ShimmerGrid />
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="lp-footer" id="connect">
        <div className="lp-container">
          <div className="lp-footer-cta reveal">
            <div className="lp-footer-cta-head">
              <span className="lp-label">Realtime claim validator</span>
              <h2 className="lp-footer-cta-title font-array-wide">
                Let&apos;s settle it,{" "}
                <span className="lp-accent font-bebas">live.</span>
              </h2>
            </div>
            <Link href="/main" className="lp-cta">
              Open the deck
              <ArrowRight />
            </Link>
          </div>

          <nav className="lp-footer-nav">
            <div className="lp-footer-col">
              <h3>Product</h3>
              <ul>
                <li>
                  <Link href="/main">Open deck</Link>
                </li>
                <li>
                  <a href="#product">Product</a>
                </li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h3>Connect</h3>
              <ul>
                <li>
                  <a href="https://www.linkedin.com/in/tami-cp0" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://x.com/tami_cp0" target="_blank" rel="noopener noreferrer">
                    X
                  </a>
                </li>
              </ul>
            </div>
            <div className="lp-footer-col lp-footer-visit">
              <h3>Reach</h3>
              <p>
                <a href="mailto:worktamilore@gmail.com">worktamilore@gmail.com</a>
              </p>
            </div>
          </nav>

          <div className="lp-watermark" aria-hidden>
            <span className="font-bebas">ponoc</span>
          </div>

          <div className="lp-footer-bottom">
            <p>© {new Date().getFullYear()} ponoc. All rights reserved.</p>
            <div className="lp-footer-legal">
              <Link href="/legal#privacy">Privacy</Link>
              <Link href="/legal#terms">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
