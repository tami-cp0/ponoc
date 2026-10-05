"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const INTERVAL_MS = 30_000;

export function AutoRefresh() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [paused, setPaused] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const refresh = () =>
    startRefresh(() => {
      router.refresh();
      setUpdatedAt(Date.now());
    });

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      startRefresh(() => {
        router.refresh();
        setUpdatedAt(Date.now());
      });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, router]);

  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));

  return (
    <div className="admin-refresh">
      <span className="admin-refresh-status" aria-live="polite">
        {refreshing ? "Refreshing…" : paused ? `Paused · updated ${seconds}s ago` : `Updated ${seconds}s ago`}
      </span>
      <button type="button" className="admin-text-button" onClick={refresh} disabled={refreshing}>
        Refresh
      </button>
      <button type="button" className="admin-text-button" onClick={() => setPaused((p) => !p)}>
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
