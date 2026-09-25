import { asc, eq } from "drizzle-orm";
import { db, usageRecord } from "../db";

// Every verdict the user has ever had, oldest first (true = TRUE card).
// usage_record keeps counts per session, not the order within one, so each
// session's falses are spread evenly among its trues.
export async function getVerdictHistory(userId: string): Promise<boolean[]> {
  const sessions = await db
    .select({ trues: usageRecord.claimsTrue, falses: usageRecord.claimsFalse })
    .from(usageRecord)
    .where(eq(usageRecord.userId, userId))
    .orderBy(asc(usageRecord.createdAt));

  return sessions.flatMap((s) => spreadVerdicts(s.trues, s.falses));
}

export function spreadVerdicts(trues: number, falses: number): boolean[] {
  const total = trues + falses;
  const out: boolean[] = [];
  let placedFalses = 0;
  for (let i = 0; i < total; i++) {
    const falseDue = Math.floor(((i + 1) * falses) / total) > placedFalses;
    if (falseDue) placedFalses++;
    out.push(!falseDue);
  }
  return out;
}
