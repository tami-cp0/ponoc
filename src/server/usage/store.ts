import { eq, sql } from "drizzle-orm";
import { db, liveSession, user } from "../db";
import { notify } from "../notify";
import type { UsageSnapshot } from "./UsageMeter";

export async function startLiveSession(userId: string): Promise<string> {
  const [row] = await db.insert(liveSession).values({ userId }).returning({ id: liveSession.id });
  return row.id;
}

// Writes the session's running totals and charges the user whatever is new since
// the last save, in one transaction: saving the same totals twice charges nothing.
export async function saveUsage(sessionId: string, usage: UsageSnapshot, ended = false): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ userId: liveSession.userId, creditsUsed: liveSession.creditsUsed })
      .from(liveSession)
      .where(eq(liveSession.id, sessionId))
      .for("update");
    if (!row) return;

    const { costMicros, creditsMicros, ...counts } = usage;
    // In whole millionths, and applied in SQL, so the balance stays exact.
    const chargeMicros = creditsMicros - Math.round(row.creditsUsed * 1_000_000);

    await tx
      .update(liveSession)
      .set({
        ...counts,
        costUsd: sql`${costMicros}::numeric / 1000000`,
        creditsUsed: sql`${creditsMicros}::numeric / 1000000`,
        ...(ended ? { endedAt: new Date() } : {}),
      })
      .where(eq(liveSession.id, sessionId));

    if (chargeMicros !== 0) {
      await tx
        .update(user)
        .set({ credits: sql`${user.credits} - ${chargeMicros}::numeric / 1000000` })
        .where(eq(user.id, row.userId));
    }
  });
}

// The user's balance and what this session has been charged so far, in millionths.
// Read in one query so they always agree, even while a save is landing.
export async function readLiveBalance(
  sessionId: string,
): Promise<{ balanceMicros: number; chargedMicros: number } | null> {
  const [row] = await db
    .select({ credits: user.credits, charged: liveSession.creditsUsed })
    .from(liveSession)
    .innerJoin(user, eq(user.id, liveSession.userId))
    .where(eq(liveSession.id, sessionId));
  if (!row) return null;
  return {
    balanceMicros: Math.round(row.credits * 1_000_000),
    chargedMicros: Math.round(row.charged * 1_000_000),
  };
}

export async function finishLiveSession(
  sessionId: string,
  userId: string,
  usage: UsageSnapshot,
  ranOut: boolean,
): Promise<void> {
  await saveUsage(sessionId, usage, true);
  if (ranOut) await notify(userId, "credits_ran_out", "Ran out of credits while listening");
  await notify(userId, "session_ended", describeSession(usage));
}

function describeSession(usage: UsageSnapshot): string {
  const minutes = Math.floor(usage.audioSeconds / 60);
  const seconds = usage.audioSeconds % 60;
  const checked = usage.claimsTrue + usage.claimsFalse + usage.claimsUnsure;
  const failed = usage.claimsError ? `, ${usage.claimsError} of them failed` : "";
  const credits = (usage.creditsMicros / 1_000_000).toFixed(3);
  return (
    `Listened ${minutes}m ${seconds}s · ${checked} claims checked ` +
    `(${usage.claimsTrue} true, ${usage.claimsFalse} false, ${usage.claimsUnsure} unsure${failed}) · ${credits} credits`
  );
}
