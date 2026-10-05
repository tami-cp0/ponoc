"use client";

import { useEffect, useState } from "react";

const EMAILS = ["worktamilore@gmail.com", "ishob080@uottawa.ca"];
const SHOW_MS = 1400;

export function ReachEmails() {
  const [copied, setCopied] = useState<string | null>(null);
  // Counts copies, so copying again restarts the timer.
  const [copies, setCopies] = useState(0);

  useEffect(() => {
    if (copies === 0) return;
    const timer = window.setTimeout(() => setCopied(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [copies]);

  const copy = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopied(email);
    setCopies((n) => n + 1);
  };

  return (
    <ul>
      {EMAILS.map((email) => (
        <li key={email}>
          <button type="button" className="lp-copy" aria-label={`Copy ${email}`} onClick={() => copy(email)}>
            {email}
            <span className="lp-copied" data-show={copied === email} aria-hidden>
              copied
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
