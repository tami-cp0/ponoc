import { boolean, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // The columns below are ours, not better-auth's. Because better-auth isn't told
  // about them, its endpoints never return them to the browser or let users set
  // them. Declaring one to better-auth (additionalFields) would need returned:
  // false and input: false to keep it that way.

  // The balance, in credits. Edit it to change what a user has.
  credits: numeric("credits", { precision: 14, scale: 6, mode: "number" }).notNull().default(0),
  // When the welcome-gift popup was dismissed; null until then.
  welcomeSeenAt: timestamp("welcome_seen_at", { withTimezone: true }),
  // Can open /admin. Set by hand in the database.
  isAdmin: boolean("is_admin").notNull().default(false),
});
