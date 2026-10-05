import { inArray, sql, type AnyColumn } from "drizzle-orm";
import { CREDIT_USD } from "@/shared/credits";
import { db, liveSession, user } from "../db";
import { listeningUserIds } from "../live-registry";

export interface Period {
  sessions: number;
  seconds: number;
  claimsTrue: number;
  claimsFalse: number;
  claimsFailed: number;
  costUsd: number;
  creditsUsed: number;
  // What those credits sell for, and what's left after provider costs.
  chargedUsd: number;
  marginUsd: number;
}

export interface Overview {
  users: { total: number; lastDay: number; lastWeek: number };
  listening: { id: string; email: string }[];
  lastDay: Period;
  lastWeek: Period;
}

async function usageSince(interval: "1 day" | "7 days"): Promise<Period> {
  const total = (column: AnyColumn) =>
    sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);
  const [row] = await db
    .select({
      sessions: sql<number>`count(*)`.mapWith(Number),
      seconds: total(liveSession.audioSeconds),
      claimsTrue: total(liveSession.claimsTrue),
      claimsFalse: total(liveSession.claimsFalse),
      claimsFailed: total(liveSession.claimsError),
      costUsd: total(liveSession.costUsd),
      creditsUsed: total(liveSession.creditsUsed),
    })
    .from(liveSession)
    .where(sql`${liveSession.startedAt} > now() - ${interval}::interval`);

  const chargedUsd = row.creditsUsed * CREDIT_USD;
  return {
    sessions: row.sessions,
    seconds: row.seconds,
    claimsTrue: row.claimsTrue,
    claimsFalse: row.claimsFalse,
    claimsFailed: row.claimsFailed,
    costUsd: row.costUsd,
    creditsUsed: row.creditsUsed,
    chargedUsd,
    marginUsd: chargedUsd - row.costUsd,
  };
}

export async function getOverview(): Promise<Overview> {
  const listeningIds = listeningUserIds();
  const [[users], lastDay, lastWeek, listening] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        lastDay: sql<number>`count(*) filter (where ${user.createdAt} > now() - interval '1 day')`.mapWith(Number),
        lastWeek: sql<number>`count(*) filter (where ${user.createdAt} > now() - interval '7 days')`.mapWith(Number),
      })
      .from(user),
    usageSince("1 day"),
    usageSince("7 days"),
    listeningIds.length
      ? db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, listeningIds))
      : Promise.resolve([]),
  ]);
  return { users, listening, lastDay, lastWeek };
}
