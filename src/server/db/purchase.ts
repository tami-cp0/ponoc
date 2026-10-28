import { integer, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";

export const purchase = pgTable(
  "purchase",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    packId: text("pack_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    credits: numeric("credits", { precision: 14, scale: 6, mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    presentmentAmount: integer("presentment_amount"),
    presentmentCurrency: text("presentment_currency"),
    status: text("status").notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeEventId: text("stripe_event_id").unique(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  },
  (table) => [index("purchase_user_created_idx").on(table.userId, table.createdAt)],
);
