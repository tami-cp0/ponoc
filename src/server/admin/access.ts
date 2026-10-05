import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getUser, type SignedInUser } from "../auth";
import { db, user } from "../db";

// Anyone who isn't a signed-in admin gets a 404, so /admin doesn't reveal it exists.
// Every admin page and action calls this; layouts alone don't re-check on navigation.
export async function requireAdmin(): Promise<SignedInUser> {
  const signedIn = await getUser(await headers());
  if (!signedIn) notFound();
  const [row] = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, signedIn.id));
  if (!row?.isAdmin) notFound();
  return signedIn;
}
