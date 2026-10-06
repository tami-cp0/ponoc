"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/Button";
import { ColumnLines } from "@/components/ColumnLines";
import { ReachEmails } from "@/components/landing/ReachEmails";
import { ShimmerGrid } from "@/components/landing/ShimmerGrid";
import { ShowcaseCard } from "@/components/landing/ShowcaseCard";
import type { Card } from "@/shared/protocol";

const SHOWCASE_FALSE: Card = {
  id: "showcase-false",
  claim: "We only use ten percent of our brains.",
  status: "false",
  reasoning:
    "Brain scans show we use virtually every part of the brain, and most of it is active almost all the time ([scientificamerican.com](https://www.scientificamerican.com/article/do-we-only-use-10-percent-of-our-brains/)).",
};

const SHOWCASE_TRUE: Card = {
  id: "showcase-true",
  claim: "Grass is green.",
  status: "true",
  reasoning:
    "Yes. Grass is full of chlorophyll, which absorbs almost every color of sunlight except green. The green bounces back, and that's what we see ([askdruniverse.wsu.edu](https://askdruniverse.wsu.edu/2020/05/01/inside-blade-grass-green/)).",
};

const FEATURES = [
  {
    title: "Hears the claim",
    desc: "It listens to the room and picks out what can be checked. It skips opinions and predictions.",
  },
  {
    title: "Finds the evidence",
    desc: "It searches the web and links the page that settles it.",
  },
  {
    title: "Says true or false",
    desc: "You get the verdict while everyone is still on the topic.",
  },
];

// Structured data, so search engines can show ponoc as an app with a free start.
const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ponoc",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any (web browser)",
  description:
    "A live fact-checker. It listens to your conversation, checks each claim against the web, and calls it true or false with the source.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to try, no card needed",
  },
};

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <ColumnLines />
      <div className="lp-hero-wrap">
        <div className="lp-hero">
          <div className="lp-hero-glow" aria-hidden>
            <span />
            <span />
          </div>
          <nav className="lp-nav">
            <Link href="/login">Login</Link>
            <a href="#product">Product</a>
            <a href="#connect">Connect</a>
            <Link href="/legal#privacy">Privacy</Link>
          </nav>

          <div className="lp-hero-content">
            <div className="lp-hero-grid">
              <div className="lp-hero-head">
                <h1 className="lp-hero-title font-bebas reveal">
                  PONOC.<span className="sr-only"> Live fact-checker for real conversations</span>
                </h1>
              </div>
              <div className="lp-hero-aside reveal">
                <p className="lp-hero-lede">
                  ponoc calls facts or cap, live. It listens to the conversation and tells you
                  whether each claim is true or false, with a link to the proof. Free to try, no
                  card needed.
                </p>
                <Button href="/app" width="100%">
                  Start listening
                  <ArrowRightIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="lp-section">
        <div className="lp-manifesto reveal">
          <h2 className="lp-manifesto-statement font-array-wide">
            A conversation moves fast.{" "}
            <span className="lp-accent font-bebas">The truth</span> should keep up.
          </h2>
        </div>
      </section>

      <section className="lp-section" id="product">
        <div className="lp-container">
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

      <section className="lp-section" id="history">
        <div className="lp-container">
          <div className="lp-history-head reveal">
            <span className="lp-label">Your record</span>
            <h2 className="lp-product-title font-array-wide">One square for every claim.</h2>
          </div>
          <div className="reveal">
            <ShimmerGrid />
          </div>
        </div>
      </section>

      <footer className="lp-footer" id="connect">
        <div className="lp-container">
          <div className="lp-footer-cta reveal">
            <div className="lp-footer-cta-head">
              <span className="lp-label">Facts or cap?</span>
              <h2 className="lp-footer-cta-title font-array-wide">
                Let&apos;s settle it,{" "}
                <span className="lp-accent font-bebas">live.</span>
              </h2>
            </div>
            <Button href="/app">
              Start listening
              <ArrowRightIcon />
            </Button>
          </div>

          <nav className="lp-footer-nav">
            <div className="lp-footer-col">
              <h3>Product</h3>
              <ul>
                <li>
                  <Link href="/app">Open the app</Link>
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
              <ReachEmails />
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
