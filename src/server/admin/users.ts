import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, liveSession, notification, session, user } from "../db";
import { listeningUserIds } from "../live-registry";
import { notify } from "../notify";

const userFields = {
  id: user.id,
  name: user.name,
  email: user.email,
  credits: user.credits,
  createdAt: user.createdAt,
  isAdmin: user.isAdmin,
};

export const USERS_PER_PAGE = 25;

// By email or name, newest first; every account when there's no query.
export async function searchUsers(query: string, page: number) {
  const q = query.trim();
  // % and _ are wildcards in LIKE; escape them so they match themselves.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const match = q ? or(ilike(user.email, pattern), ilike(user.name, pattern)) : undefined;

  const [users, [{ total }]] = await Promise.all([
    db
      .select(userFields)
      .from(user)
      .where(match)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(USERS_PER_PAGE)
      .offset((page - 1) * USERS_PER_PAGE),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(user).where(match),
  ]);
  return { users, total, pages: Math.max(1, Math.ceil(total / USERS_PER_PAGE)) };
}

export async function getUserDetail(id: string) {
  const [profile] = await db.select(userFields).from(user).where(eq(user.id, id));
  if (!profile) return null;

  const [[totals], sessions, timeline, [{ signedIn }]] = await Promise.all([
    db
      .select({
        sessions: sql<number>`count(*)`.mapWith(Number),
        seconds: sql<number>`coalesce(sum(${liveSession.audioSeconds}), 0)`.mapWith(Number),
        creditsUsed: sql<number>`coalesce(sum(${liveSession.creditsUsed}), 0)`.mapWith(Number),
        costUsd: sql<number>`coalesce(sum(${liveSession.costUsd}), 0)`.mapWith(Number),
      })
      .from(liveSession)
      .where(eq(liveSession.userId, id)),
    db.select().from(liveSession).where(eq(liveSession.userId, id)).orderBy(desc(liveSession.startedAt)).limit(20),
    db
      .select({ id: notification.id, createdAt: notification.createdAt, type: notification.type, message: notification.message })
      .from(notification)
      .where(eq(notification.userId, id))
      .orderBy(desc(notification.createdAt))
      .limit(100),
    db
      .select({ signedIn: sql<number>`count(*)`.mapWith(Number) })
      .from(session)
      .where(sql`${session.userId} = ${id} and ${session.expiresAt} > now()`),
  ]);

  return {
    profile,
    totals,
    sessions,
    timeline,
    signedIn: signedIn > 0,
    listening: listeningUserIds().includes(id),
  };
}

const AMOUNT = /^-?\d+(\.\d{1,6})?$/;

// "set" makes the balance exactly `amount`; "add" adds it (negative to take away).
// Logged to the user's timeline either way.
export async function adjustCredits(id: string, mode: "set" | "add", amount: string): Promise<string | null> {
  if (!AMOUNT.test(amount.trim())) return "Enter a number with up to 6 decimal places.";
  const value = amount.trim();

  const change = await db.transaction(async (tx) => {
    const [before] = await tx.select({ credits: user.credits }).from(user).where(eq(user.id, id)).for("update");
    if (!before) return null;
    const [after] = await tx
      .update(user)
      .set({ credits: mode === "set" ? sql`${value}::numeric` : sql`${user.credits} + ${value}::numeric` })
      .where(eq(user.id, id))
      .returning({ credits: user.credits });
    return { before: before.credits, after: after.credits };
  });
  if (!change) return "User not found.";

  await notify(id, "credits_adjusted", `Admin changed balance from ${change.before} to ${change.after} credits`);
  return null;
}

// Ends every sign-in. A live session stops at the gateway's next sign-in check (within a minute).
export async function signOutEverywhere(id: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, id));
  await notify(id, "signed_out", "Signed out everywhere by admin");
}
