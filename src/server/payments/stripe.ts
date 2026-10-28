import Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db, notification, purchase, user } from "@/server/db";
import {
  CREDIT_PACKS,
  MAX_PURCHASE_USD,
  MIN_PURCHASE_USD,
  PURCHASE_CURRENCY,
  creditsForUsd,
  type CheckoutSelection,
} from "@/shared/credits";
import { env } from "@/server/env";

const stripe = () => new Stripe(env.stripeSecretKey);

export type PurchaseStatus = "pending" | "paid" | "failed";

export interface PurchaseSnapshot {
  id: string;
  userId: string;
  packId: string;
  amountCents: number;
  credits: number;
  currency: string;
  status: PurchaseStatus;
  stripeCheckoutSessionId: string | null;
  failureReason: string | null;
}

export function snapshotFromSelection(userId: string, id: string, selection: CheckoutSelection): PurchaseSnapshot {
  const pack = CREDIT_PACKS.find((candidate) => candidate.id === selection.packId);
  if (selection.packId !== "custom" && !pack) throw new Error("Unknown credit pack");

  const usd = selection.packId === "custom" ? selection.usd : pack!.usd;
  const credits = selection.packId === "custom" ? creditsForUsd(usd) : pack!.credits;
  if (!Number.isInteger(usd) || usd < MIN_PURCHASE_USD || usd > MAX_PURCHASE_USD) {
    throw new Error(`Purchase amount must be a whole number from ${MIN_PURCHASE_USD} to ${MAX_PURCHASE_USD}`);
  }
  if (selection.credits !== credits || selection.usd !== usd) throw new Error("Invalid credit selection");

  return {
    id,
    userId,
    packId: selection.packId,
    amountCents: usd * 100,
    credits,
    currency: PURCHASE_CURRENCY,
    status: "pending",
    stripeCheckoutSessionId: null,
    failureReason: null,
  };
}

export async function createOrGetCheckout(
  userId: string,
  selection: CheckoutSelection,
  requestedId: string,
): Promise<{ id: string; url: string }> {
  const expected = snapshotFromSelection(userId, requestedId, selection);
  await db
    .insert(purchase)
    .values(expected)
    .onConflictDoNothing({ target: purchase.id });

  const [stored] = await db.select().from(purchase).where(and(eq(purchase.id, requestedId), eq(purchase.userId, userId)));
  if (!stored) throw new Error("Purchase attempt was not found");
  if (
    stored.packId !== expected.packId ||
    stored.amountCents !== expected.amountCents ||
    stored.credits !== expected.credits ||
    stored.currency !== expected.currency
  ) {
    throw new Error("Purchase attempt does not match the selected credits");
  }
  if (stored.status === "paid") throw new Error("Purchase has already been completed");

  const client = stripe();
  if (stored.stripeCheckoutSessionId) {
    const session = await client.checkout.sessions.retrieve(stored.stripeCheckoutSessionId);
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { id: stored.id, url: session.url };
  }

  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      automatic_tax: { enabled: false },
      adaptive_pricing: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: PURCHASE_CURRENCY,
            unit_amount: expected.amountCents,
            product_data: { name: `${expected.credits} ponoc credits` },
          },
          quantity: 1,
        },
      ],
      metadata: { purchase_id: expected.id },
      success_url: `${env.siteUrl}/app?checkout=success&purchase_id=${expected.id}`,
      cancel_url: `${env.siteUrl}/app?checkout=cancelled&purchase_id=${expected.id}`,
    },
    { idempotencyKey: expected.id },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  await db
    .update(purchase)
    .set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
    .where(and(eq(purchase.id, expected.id), eq(purchase.userId, userId)));

  return { id: expected.id, url: session.url };
}

export async function getOwnedPurchase(userId: string, id: string): Promise<PurchaseSnapshot | null> {
  const [row] = await db.select().from(purchase).where(and(eq(purchase.id, id), eq(purchase.userId, userId)));
  return row ? { ...row, status: row.status as PurchaseStatus } : null;
}

export async function reconcileOwnedPurchase(userId: string, id: string): Promise<PurchaseSnapshot | null> {
  const owned = await getOwnedPurchase(userId, id);
  if (!owned || owned.status !== "pending" || !owned.stripeCheckoutSessionId) return owned;

  const session = await stripe().checkout.sessions.retrieve(owned.stripeCheckoutSessionId);
  if (session.payment_status === "paid") {
    await fulfillCheckout(session, `recovery:${session.id}`);
    return getOwnedPurchase(userId, id);
  }
  return owned;
}

export async function fulfillCheckout(session: Stripe.Checkout.Session, eventId: string): Promise<void> {
  const purchaseId = session.metadata?.purchase_id;
  if (!purchaseId || session.payment_status !== "paid") throw new Error("Stripe session is not a paid ponoc purchase");

  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(purchase).where(eq(purchase.id, purchaseId)).for("update");
    if (!row) throw new Error("Purchase for Stripe session was not found");
    if (row.status === "paid") return;
    if (row.stripeCheckoutSessionId && row.stripeCheckoutSessionId !== session.id) {
      throw new Error("Stripe session does not match purchase snapshot");
    }
    if (row.currency !== session.currency || row.amountCents !== session.amount_total) {
      throw new Error("Stripe amount or currency does not match purchase snapshot");
    }

    await tx
      .update(purchase)
      .set({
        status: "paid",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripeEventId: eventId,
        updatedAt: new Date(),
        fulfilledAt: new Date(),
      })
      .where(eq(purchase.id, purchaseId));
    await tx
      .update(user)
      .set({ credits: sql`${user.credits} + ${row.credits}` })
      .where(eq(user.id, row.userId));
    const [owner] = await tx.select({ email: user.email }).from(user).where(eq(user.id, row.userId));
    await tx.insert(notification).values({
      userId: row.userId,
      email: owner?.email ?? null,
      type: "credits_topped_up",
      message: `Added ${row.credits} credits`,
    });
  });
}

export async function markCheckoutFailed(session: Stripe.Checkout.Session, reason: string): Promise<void> {
  const purchaseId = session.metadata?.purchase_id;
  if (!purchaseId) return;
  await db
    .update(purchase)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(and(eq(purchase.id, purchaseId), eq(purchase.status, "pending")));
}
