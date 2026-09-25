"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Button } from "@/components/Button";

// Shown when a page fails to load, e.g. the database can't be reached.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="notfound">
      <span className="notfound-wordmark font-array">ponoc</span>
      <p className="notfound-message">Couldn&apos;t load this page.</p>
      <p className="notfound-message">Check your connection and try again.</p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
