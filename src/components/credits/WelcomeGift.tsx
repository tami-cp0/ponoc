"use client";

import { TRIAL_CREDITS } from "@/shared/credits";
import { Dialog } from "../Dialog";
import { Button } from "../Button";

interface Props {
  open: boolean;
  onStart: () => void;
  onClose: () => void;
}

export function WelcomeGift({ open, onStart, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} label="Your free credits" className="gift">
      <div className="gift-coin" aria-hidden>
        <span className="gift-coin-face">
          <span className="gift-coin-num font-array">{TRIAL_CREDITS}</span>
          <span className="gift-coin-unit">credits</span>
        </span>
      </div>

      <h2 className="gift-title font-array">{TRIAL_CREDITS} credits, on us</h2>
      <p className="gift-lede">
        They&apos;re already in your account, ready for your first session. No card needed.
      </p>

      <div className="credit-actions">
        <Button onClick={onStart}>Start listening</Button>
        <button className="credit-link" onClick={onClose}>
          Look around first
        </button>
      </div>
    </Dialog>
  );
}
