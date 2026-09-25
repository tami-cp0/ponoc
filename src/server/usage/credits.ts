import { and, eq, isNull, sum } from "drizzle-orm";
import { TRIAL_CREDITS } from "@/shared/credits";
import { creditGrant, db, usageRecord } from "../db";

export async function grantTrial(userId: string): Promise<void> {
  await db.insert(creditGrant).values({ userId, creditsMicros: TRIAL_CREDITS * 1_000_000, reason: "trial" });
}

// Everything granted minus everything used, in millionths of a credit. Can dip
// slightly below zero: claims already being checked when credits run out still finish.
export async function getBalanceMicros(userId: string): Promise<number> {
  const [granted] = await db
    .select({ total: sum(creditGrant.creditsMicros) })
    .from(creditGrant)
    .where(eq(creditGrant.userId, userId));
  const [used] = await db
    .select({ total: sum(usageRecord.creditsMicros) })
    .from(usageRecord)
    .where(eq(usageRecord.userId, userId));
  return Number(granted.total ?? 0) - Number(used.total ?? 0);
}

const unseenTrial = (userId: string) =>
  and(eq(creditGrant.userId, userId), eq(creditGrant.reason, "trial"), isNull(creditGrant.seenAt));

export async function hasUnseenTrial(userId: string): Promise<boolean> {
  const rows = await db.select({ id: creditGrant.id }).from(creditGrant).where(unseenTrial(userId)).limit(1);
  return rows.length > 0;
}

export async function markTrialSeen(userId: string): Promise<void> {
  await db.update(creditGrant).set({ seenAt: new Date() }).where(unseenTrial(userId));
}
