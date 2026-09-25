import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";

// Credits added to an account. A user's balance is everything granted minus
// everything used (usage_record.credits_micros), so there's no balance to drift.
export const creditGrant = pgTable(
  "credit_grant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    creditsMicros: bigint("credits_micros", { mode: "number" }).notNull(),
    reason: text("reason").notNull(),
    // When the user was shown the grant (e.g. the welcome gift).
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (table) => [index("credit_grant_user_idx").on(table.userId)],
);
