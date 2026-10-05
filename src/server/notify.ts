import { eq } from "drizzle-orm";
import { db, notification, user } from "./db";

export type NotificationType =
  | "signed_up"
  | "signed_in"
  | "signed_out"
  | "credits_granted"
  | "credits_topped_up"
  | "credits_adjusted"
  | "credits_ran_out"
  | "session_ended";

// Records an account event for the owner. A failure is logged, never thrown:
// a missed notification must not break sign-in or billing.
export async function notify(userId: string, type: NotificationType, message: string): Promise<void> {
  try {
    const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
    await db.insert(notification).values({ userId, email: row?.email ?? null, type, message });
  } catch (err) {
    console.error(`notify ${type} failed:`, (err as Error).message);
  }
}
