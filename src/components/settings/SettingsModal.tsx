"use client";

import { useEffect, useRef } from "react";

interface Tally {
  truths: number;
  falses: number;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  tally: Tally;
}

// Settings surface. Uses the native <dialog> so the panel lands in the top
// layer (escaping the deck's 3D transforms), traps focus, and closes on Esc
// without our own key handling. The neumorphic material and rows are styled in
// globals.css under .settings-*.
export function SettingsModal({ open, onClose, tally }: SettingsModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Drive the dialog's open state imperatively — showModal()/close() are what
  // put it in the top layer and render the ::backdrop; the `open` attribute
  // alone does not.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      onClose={onClose}
      // Close when the backdrop (the dialog element itself, outside the card) is
      // clicked. Clicks on the inner card stop at the panel and don't bubble.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="settings-panel">
        <header className="settings-head">
          <h2 className="settings-title font-array">Settings</h2>
          <button className="settings-close" aria-label="Close settings" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="settings-body">
          <AccountRow />
          <StatsRow tally={tally} />
          <BalanceRow />
          <LogOutRow />
        </div>

        <footer className="settings-foot">
          <span className="settings-wordmark font-array">ponoc</span>
        </footer>
      </div>
    </dialog>
  );
}

// Guest identity placeholder — the seat a real account drops into once auth
// exists. A carved monogram disc, not a decorative avatar.
function AccountRow() {
  return (
    <div className="settings-row settings-account">
      <span className="settings-avatar" aria-hidden>
        G
      </span>
      <span className="settings-account-text">
        <span className="settings-row-label">Guest</span>
        <span className="settings-row-sub">Not signed in</span>
      </span>
    </div>
  );
}

// The session's verdict tally — the same true/false the deck shows in green and
// red, totalled. Two carved counters, tinted with the verdict colours.
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
      </div>
    </div>
  );
}

// Credits + pay-as-you-go. Credits lead — usage is billed against them, and the
// raw meter is never shown to the user. Dormant until billing exists: the row
// keeps its place but drops to a flat recess and can't be pressed.
function BalanceRow() {
  return (
    <div className="settings-row settings-soon" aria-disabled>
      <div className="settings-row-head">
        <span className="settings-row-label">Credits</span>
        <span className="settings-soon-tag">Coming soon</span>
      </div>
      <div className="settings-balance">
        <div className="settings-balance-amount">
          <span className="settings-meter-num">0</span>
          <span className="settings-meter-unit">credits</span>
        </div>
        <button className="settings-topup" disabled tabIndex={-1}>
          Add credits
        </button>
      </div>
      <div className="settings-payg">
        <span className="settings-payg-text">
          <span className="settings-row-label">Pay as you go</span>
          <span className="settings-row-sub">Keep going when your credits run out</span>
        </span>
        <span className="settings-switch" aria-hidden />
      </div>
    </div>
  );
}

// Nothing to sign out of yet — dormant, same treatment as Balance.
function LogOutRow() {
  return (
    <button className="settings-row settings-logout settings-soon" disabled tabIndex={-1}>
      <span className="settings-row-label">Log out</span>
      <span className="settings-soon-tag">Coming soon</span>
    </button>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
