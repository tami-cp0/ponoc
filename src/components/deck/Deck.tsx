"use client";

import { useMemo, useState } from "react";
import { dismissWelcome } from "@/app/app/actions";
import { useLiveSession } from "@/client/useLiveSession";
import { useUrlDialog } from "@/client/useUrlDialog";
import { CheckoutDialog } from "../credits/CheckoutDialog";
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
  const {
    cards,
    status,
    stopping,
    credits,
    ranOut,
    notice,
    start,
    stop,
    showRanOut,
    dismissRanOut,
    dismissNotice,
    getAnalyser,
  } = useLiveSession(initialCredits);
  const dialog = useUrlDialog();
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcome);

  const running = status === "listening";
  const connecting = status === "connecting";

  const listen = () => void start();

  const openCheckout = () => {
    dismissRanOut();
    dialog.open("checkout");
  };

  const toggle = () => {
    if (running || connecting) stop();
    else if (credits <= 0) showRanOut();
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
        <Button
          aria-label="Settings"
          width="var(--gear-size)"
          height="var(--gear-size)"
          onClick={() => dialog.open("settings")}
        >
          <GearIcon />
        </Button>
      </header>
      <ClaimDeck
        cards={cards}
        running={running}
        stopping={stopping}
        connecting={connecting}
        verdictHistory={verdictHistory}
        onToggle={toggle}
        getAnalyser={getAnalyser}
      />
      <SettingsModal
        open={dialog.current === "settings"}
        onClose={() => dialog.close("settings")}
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
      <OutOfCredits open={ranOut} onTopUp={openCheckout} onClose={dismissRanOut} />
      <CheckoutDialog open={dialog.current === "checkout"} onClose={() => dialog.close("checkout")} />
    </div>
  );
}
