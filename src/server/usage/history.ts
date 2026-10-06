import { asc, eq } from "drizzle-orm";
import type { VerdictStatus } from "@/shared/protocol";
import { db, liveSession } from "../db";

// Every verdict the user has ever had, oldest first.
// live_session keeps counts per session, not the order within one, so each
// session's falses and unsures are spread evenly among its trues.
export async function getVerdictHistory(userId: string): Promise<VerdictStatus[]> {
  const sessions = await db
    .select({ trues: liveSession.claimsTrue, falses: liveSession.claimsFalse, unsures: liveSession.claimsUnsure })
    .from(liveSession)
    .where(eq(liveSession.userId, userId))
    .orderBy(asc(liveSession.startedAt));

  return sessions.flatMap((s) => spreadVerdicts(s.trues, s.falses, s.unsures));
}

export function spreadVerdicts(trues: number, falses: number, unsures = 0): VerdictStatus[] {
  const called = spread(Array<VerdictStatus>(trues).fill("true"), "false", falses);
  return spread(called, "unsure", unsures);
}

// Places `count` copies of `extra` evenly among the base verdicts, keeping their order.
function spread(base: VerdictStatus[], extra: VerdictStatus, count: number): VerdictStatus[] {
  const total = base.length + count;
  const out: VerdictStatus[] = [];
  let placed = 0;
  for (let i = 0; i < total; i++) {
    const due = Math.floor(((i + 1) * count) / total) > placed;
    if (due) placed++;
    out.push(due ? extra : base[i - placed]);
  }
  return out;
}
