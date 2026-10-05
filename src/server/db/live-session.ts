import { index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";

// One row per listening session (Start → Stop): what it used, what it cost us,
// and what the user was charged.
export const liveSession = pgTable(
  "live_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    audioSeconds: integer("audio_seconds").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    webSearches: integer("web_searches").notNull().default(0),
    claimsTrue: integer("claims_true").notNull().default(0),
    claimsFalse: integer("claims_false").notNull().default(0),
    claimsError: integer("claims_error").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 14, scale: 6, mode: "number" }).notNull().default(0),
    creditsUsed: numeric("credits_used", { precision: 14, scale: 6, mode: "number" }).notNull().default(0),
  },
  (table) => [index("live_session_user_started_idx").on(table.userId, table.startedAt)],
);
