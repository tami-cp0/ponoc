"use client";

import { useEffect } from "react";

const SHOW_MS = 5000;

// A short, flat notice for when listening stops on its own. Tap to dismiss.
export function LiveNotice({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <button type="button" className="live-notice" role="status" onClick={onDismiss}>
      {message}
    </button>
  );
}
