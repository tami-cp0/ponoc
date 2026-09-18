"use client";

import { useState } from "react";
import { ClaimDeckStage } from "../../components/deck/ClaimDeckStage-copy";
import type { Card } from "../../lib/types";

const SEED: Card[] = [
  {
    id: "a",
    claim: "The Great Wall of China is visible from space with the naked eye.",
    status: "false",
    reasoning: "It is not. The wall is far too narrow to distinguish from low Earth orbit without magnification.",
    backgrounded: false,
  },
  {
    id: "b",
    claim: "Water boils at 100°C at sea level.",
    status: "true",
    reasoning: "Correct at standard atmospheric pressure (1 atm); the boiling point drops with altitude.",
    backgrounded: false,
  },
];

export default function MainPage() {
  const [cards, setCards] = useState<Card[]>(SEED);

  // Demo: manufacture a claim that verifies after a delay, mirroring the live
  // spawn → verdict flow so the deck's sync path is exercised.
  const addDemoClaim = () => {
    const id = `c-${Date.now()}`;
    const verdict = Math.random() > 0.5 ? "true" : "false";
    setCards((cs) => [
      ...cs,
      {
        id,
        claim: "A freshly detected claim awaiting verification.",
        status: "verifying",
        reasoning: "Resolved after checking the record.",
        backgrounded: false,
      },
    ]);
    window.setTimeout(() => {
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: verdict } : c)));
    }, 2200);
  };

  return (
    <div className="deck-page deck-page-3d">
      <header className="deck-header">
        <span className="deck-wordmark font-array">pinto</span>
        <button className="deck-settings" aria-label="Settings">
          <GearIcon />
        </button>
      </header>
      <ClaimDeckStage cards={cards} onAddDemoClaim={addDemoClaim} />
    </div>
  );
}

// Material Design "settings" gear — a solid, known-good cog (filled shape with a
// centre hole). Uses currentColor; the recessed/engraved look is applied in CSS
// via .deck-settings.
function GearIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}
