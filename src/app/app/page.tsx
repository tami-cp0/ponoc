import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Deck } from "@/components/deck/Deck";
import { getUser } from "@/server/auth";
import { getBalanceMicros, hasUnseenWelcome } from "@/server/usage/credits";
import { getVerdictHistory } from "@/server/usage/history";

export const metadata: Metadata = {
  title: "Deck",
  robots: { index: false },
};

export default async function AppPage() {
  const user = await getUser(await headers());
  if (!user) redirect("/login");

  const [balance, showWelcome, verdictHistory] = await Promise.all([
    getBalanceMicros(user.id),
    hasUnseenWelcome(user.id),
    getVerdictHistory(user.id),
  ]);

  return (
    <Deck
      account={{ name: user.name, email: user.email }}
      credits={Math.max(0, balance) / 1_000_000}
      verdictHistory={verdictHistory}
      showWelcome={showWelcome}
    />
  );
}
