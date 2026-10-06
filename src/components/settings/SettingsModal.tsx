"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/client/auth-client";
import { formatCredits } from "@/shared/credits";
import { Dialog } from "../Dialog";
import { CloseIcon } from "../icons";
import { Button } from "../Button";

interface Tally {
  truths: number;
  falses: number;
  unsures: number;
}

export interface Account {
  name: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tally: Tally;
  account: Account;
  credits: number;
  onAddCredits: () => void;
}

export function SettingsModal({ open, onClose, tally, account, credits, onAddCredits }: Props) {
  return (
    <Dialog open={open} onClose={onClose} label="Settings">
      <header className="settings-head">
        <h2 className="settings-title font-array">Settings</h2>
        <Button aria-label="Close settings" width={38} height={38} onClick={onClose}>
          <CloseIcon />
        </Button>
      </header>

      <div className="settings-body">
        <AccountRow account={account} />
        <StatsRow tally={tally} />
        <BalanceRow credits={credits} onAddCredits={onAddCredits} />
        <LogOutRow />
      </div>

      <footer className="settings-foot">
        <span className="settings-wordmark font-array">ponoc</span>
      </footer>
    </Dialog>
  );
}

function AccountRow({ account }: { account: Account }) {
  return (
    <div className="settings-row settings-account">
      <span className="settings-avatar" aria-hidden>
        {account.name.charAt(0).toUpperCase()}
      </span>
      <span className="settings-account-text">
        <span className="settings-row-label">{account.name}</span>
        <span className="settings-row-sub">{account.email}</span>
      </span>
    </div>
  );
}

function StatsRow({ tally }: { tally: Tally }) {
  return (
    <div className="settings-row settings-stats">
      <div className="settings-row-head">
        <span className="settings-row-label">Checks</span>
        <span className="settings-row-sub">this session</span>
      </div>
      <div className="settings-tally">
        <div className="settings-stat settings-stat-true">
          <span className="settings-stat-num">{tally.truths.toLocaleString()}</span>
          <span className="settings-stat-label">true</span>
        </div>
        <div className="settings-stat settings-stat-false">
          <span className="settings-stat-num">{tally.falses.toLocaleString()}</span>
          <span className="settings-stat-label">false</span>
        </div>
        <div className="settings-stat settings-stat-unsure">
          <span className="settings-stat-num">{tally.unsures.toLocaleString()}</span>
          <span className="settings-stat-label">unsure</span>
        </div>
      </div>
    </div>
  );
}

function BalanceRow({ credits, onAddCredits }: { credits: number; onAddCredits: () => void }) {
  return (
    <div className="settings-row">
      <div className="settings-row-head">
        <span className="settings-row-label">Credits</span>
        {credits <= 0 && <span className="settings-row-sub">Top up to keep listening</span>}
      </div>
      <div className="settings-balance">
        <div className="settings-balance-amount">
          <span className="settings-meter-num">{formatCredits(credits)}</span>
          <span className="settings-meter-unit">credits</span>
        </div>
        <Button height={38} onClick={onAddCredits}>
          Add credits
        </Button>
      </div>
      {/* Dormant until pay-as-you-go billing exists. */}
      <div className="settings-payg settings-soon" aria-disabled>
        <span className="settings-payg-text">
          <span className="settings-row-label">Pay as you go</span>
          <span className="settings-row-sub">Keep going when your credits run out</span>
        </span>
        <span className="settings-soon-tag">Coming soon</span>
      </div>
    </div>
  );
}

function LogOutRow() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const logOut = async () => {
    setPending(true);
    await authClient.signOut();
    router.push("/");
  };

  return (
    <Button width="100%" onClick={logOut} disabled={pending}>
      Log out
    </Button>
  );
}
