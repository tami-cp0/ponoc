import { eq } from "drizzle-orm";
import { db, usageRecord } from "../db";
import type { UsageSnapshot } from "./UsageMeter";

export async function createUsageRecord(userId: string): Promise<string> {
  const [row] = await db.insert(usageRecord).values({ userId }).returning({ id: usageRecord.id });
  return row.id;
}

// Writes absolute totals, so saving the same snapshot twice is harmless.
export async function saveUsage(recordId: string, usage: UsageSnapshot): Promise<void> {
  await db.update(usageRecord).set(usage).where(eq(usageRecord.id, recordId));
}
