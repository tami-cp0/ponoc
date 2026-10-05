import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";

// What happened on which account, for the owner to read. Users never see this.
export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    // Kept on the row so it still reads well after the user is deleted.
    email: text("email"),
    type: text("type").notNull(),
    message: text("message").notNull(),
  },
  (table) => [index("notification_created_idx").on(table.createdAt)],
);
