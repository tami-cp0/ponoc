"use client";

import { Dialog } from "../Dialog";
import { Button } from "../Button";

interface Props {
  open: boolean;
  tally: { truths: number; falses: number };
  onTopUp: () => void;
  onClose: () => void;
}

export function OutOfCredits({ open, tally, onTopUp, onClose }: Props) {
  const checked = tally.truths + tally.falses;

  return (
    <Dialog open={open} onClose={onClose} label="Out of credits" className="spent">
      <h2 className="spent-title font-array">You&apos;re out of credits</h2>
      <p className="spent-lede">
        Listening stopped when your balance reached zero.
        {checked > 0 && ` So far ponoc has settled ${checked} ${checked === 1 ? "claim" : "claims"} for you:`}
      </p>

      {checked > 0 && (
        <div className="settings-tally spent-tally">
          <div className="settings-stat settings-stat-true">
            <span className="settings-stat-num">{tally.truths.toLocaleString()}</span>
            <span className="settings-stat-label">true</span>
          </div>
          <div className="settings-stat settings-stat-false">
            <span className="settings-stat-num">{tally.falses.toLocaleString()}</span>
            <span className="settings-stat-label">false</span>
          </div>
        </div>
      )}

      <div className="credit-actions">
        <Button onClick={onTopUp}>Top up to keep listening</Button>
        <button className="credit-link" onClick={onClose}>
          Not now
        </button>
      </div>
    </Dialog>
  );
}
