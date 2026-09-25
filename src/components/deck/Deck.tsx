"use client";

import { useMemo, useState } from "react";
import { dismissWelcome } from "@/app/app/actions";
import { useLiveSession } from "@/client/useLiveSession";
import { LOW_CREDITS } from "@/shared/credits";
import { CheckoutDialog } from "../credits/CheckoutDialog";
import { LowCredits } from "../credits/LowCredits";
import { OutOfCredits } from "../credits/OutOfCredits";
import { WelcomeGift } from "../credits/WelcomeGift";
import { GearIcon } from "../icons";
import { Button } from "../Button";
import { SettingsModal, type Account } from "../settings/SettingsModal";
import { ClaimDeck } from "./ClaimDeck";
import { LiveNotice } from "./LiveNotice";

interface Props {
  account: Account;
  credits: number;
  verdictHistory: boolean[];
  showWelcome: boolean;
}

export function Deck({ account, credits: initialCredits, verdictHistory, showWelcome }: Props) {
  const { cards, status, credits, ranOut, notice, start, stop, dismissRanOut, dismissNotice, getAnalyser } =
    useLiveSession(initialCredits);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcome);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const running = status === "listening";
  const connecting = status === "connecting";

  const listen = () => void start();

  const openCheckout = () => {
    setSettingsOpen(false);
    dismissRanOut();
    setCheckoutOpen(true);
  };

  const toggle = () => {
    if (running || connecting) stop();
    else if (credits <= 0) openCheckout();
    else listen();
  };

  const closeWelcome = () => {
    if (!welcomeOpen) return;
    setWelcomeOpen(false);
    void dismissWelcome();
  };

  const tally = useMemo(
    () => ({
      truths: cards.filter((c) => c.status === "true").length,
      falses: cards.filter((c) => c.status === "false").length,
    }),
    [cards],
  );

  return (
    <div className="deck-page deck-page-3d">
      <header className="deck-header">
        <span className="deck-wordmark font-array">ponoc</span>
        {credits < LOW_CREDITS && <LowCredits credits={credits} onTopUp={openCheckout} />}
        <Button
          aria-label="Settings"
          width="var(--gear-size)"
          height="var(--gear-size)"
          onClick={() => setSettingsOpen(true)}
        >
          <GearIcon />
        </Button>
      </header>
      <ClaimDeck
        cards={cards}
        running={running}
        connecting={connecting}
        verdictHistory={verdictHistory}
        onToggle={toggle}
        getAnalyser={getAnalyser}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        tally={tally}
        account={account}
        credits={credits}
        onAddCredits={openCheckout}
      />
      <WelcomeGift
        open={welcomeOpen}
        onClose={closeWelcome}
        onStart={() => {
          closeWelcome();
          listen();
        }}
      />
      <LiveNotice message={notice} onDismiss={dismissNotice} />
      <OutOfCredits open={ranOut} tally={tally} onTopUp={openCheckout} onClose={dismissRanOut} />
      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
}
