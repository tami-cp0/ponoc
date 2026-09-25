import { bigint, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";

// One row per live session (Start → Stop). Money is stored in whole millionths
// ("micros"), because floats can't represent cents exactly.
export const usageRecord = pgTable(
  "usage_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    audioSeconds: integer("audio_seconds").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    webSearches: integer("web_searches").notNull().default(0),
    claimsTrue: integer("claims_true").notNull().default(0),
    claimsFalse: integer("claims_false").notNull().default(0),
    claimsError: integer("claims_error").notNull().default(0),
    costMicros: bigint("cost_micros", { mode: "number" }).notNull().default(0),
    creditsMicros: bigint("credits_micros", { mode: "number" }).notNull().default(0),
  },
  (table) => [index("usage_record_user_created_idx").on(table.userId, table.createdAt)],
);
