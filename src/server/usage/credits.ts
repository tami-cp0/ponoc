import { and, eq, isNull, sql } from "drizzle-orm";
import { TRIAL_CREDITS } from "@/shared/credits";
import { db, user } from "../db";
import { notify } from "../notify";

export async function grantTrial(userId: string): Promise<void> {
  await db
    .update(user)
    .set({ credits: sql`${user.credits} + ${TRIAL_CREDITS}` })
    .where(eq(user.id, userId));
  await notify(userId, "credits_granted", `Got ${TRIAL_CREDITS} free trial credits`);
}

// The balance in millionths of a credit, so budget checks compare whole numbers.
// Can dip slightly below zero: claims already being checked when credits run out still finish.
export async function getBalanceMicros(userId: string): Promise<number> {
  const [row] = await db.select({ credits: user.credits }).from(user).where(eq(user.id, userId));
  return Math.round((row?.credits ?? 0) * 1_000_000);
}

export async function hasUnseenWelcome(userId: string): Promise<boolean> {
  const [row] = await db.select({ seenAt: user.welcomeSeenAt }).from(user).where(eq(user.id, userId));
  return row !== undefined && row.seenAt === null;
}

export async function markWelcomeSeen(userId: string): Promise<void> {
  await db
    .update(user)
    .set({ welcomeSeenAt: new Date() })
    .where(and(eq(user.id, userId), isNull(user.welcomeSeenAt)));
}
