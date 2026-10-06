"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

// Popups worth a URL: they can be linked to, survive a reload, and close with Back.
const DIALOGS = ["settings", "checkout", "history"] as const;
export type UrlDialog = (typeof DIALOGS)[number];

// Whether the open popup was opened here (so Back closes it) rather than arriving
// with the URL (where Back would leave the page). Shared by every caller.
let openedHere = false;

function urlFor(pathname: string, params: URLSearchParams, dialog: UrlDialog | null): string {
  const rest = new URLSearchParams(params);
  for (const name of DIALOGS) rest.delete(name);
  let query = rest.toString();
  if (dialog) query = query ? `${query}&${dialog}` : dialog;
  return query ? `${pathname}?${query}` : pathname;
}

// The native history calls update useSearchParams without a server round trip.
// router.push would re-render the whole page on the server (auth, balance,
// history) before the popup could show.
export function useUrlDialog() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = DIALOGS.find((name) => params.has(name)) ?? null;

  // Once nothing is open (e.g. closed with Back), the next popup starts fresh.
  useEffect(() => {
    if (!current) openedHere = false;
  }, [current]);

  const open = useCallback(
    (dialog: UrlDialog) => {
      if (current === dialog) return;
      const url = urlFor(pathname, params, dialog);
      // Switching popups replaces the entry, so one Back still closes it.
      if (current) {
        window.history.replaceState(null, "", url);
      } else {
        openedHere = true;
        window.history.pushState(null, "", url);
      }
    },
    [current, pathname, params],
  );

  // Closes `dialog` only if it's the one open: a popup being swapped out for
  // another also fires its close, and must not close the new one.
  const close = useCallback(
    (dialog: UrlDialog) => {
      if (current !== dialog) return;
      if (openedHere) {
        openedHere = false;
        window.history.back();
      } else {
        window.history.replaceState(null, "", urlFor(pathname, params, null));
      }
    },
    [current, pathname, params],
  );

  return { current, open, close };
}
