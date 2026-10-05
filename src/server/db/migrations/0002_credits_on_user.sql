-- The balance moves onto the user as plain credits, usage_record becomes
-- live_session with money in plain decimals, credit_grant goes, and a
-- notification log is added. Existing data is carried across first.

ALTER TABLE "user" ADD COLUMN "credits" numeric(14, 6) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "welcome_seen_at" timestamp with time zone;--> statement-breakpoint

-- Balance = everything granted minus everything used, as the old code worked it out.
UPDATE "user" u SET "credits" = (
  coalesce((SELECT sum(g."credits_micros") FROM "credit_grant" g WHERE g."user_id" = u."id"), 0)
  - coalesce((SELECT sum(r."credits_micros") FROM "usage_record" r WHERE r."user_id" = u."id"), 0)
) / 1000000.0;--> statement-breakpoint

-- Keep whether the welcome gift was seen. Accounts that never got a trial grant
-- shouldn't be shown a gift they didn't get.
UPDATE "user" u SET "welcome_seen_at" = CASE
  WHEN EXISTS (SELECT 1 FROM "credit_grant" g WHERE g."user_id" = u."id" AND g."reason" = 'trial')
    THEN (SELECT max(g."seen_at") FROM "credit_grant" g WHERE g."user_id" = u."id" AND g."reason" = 'trial')
  ELSE now()
END;--> statement-breakpoint

ALTER TABLE "usage_record" RENAME TO "live_session";--> statement-breakpoint
ALTER TABLE "live_session" RENAME CONSTRAINT "usage_record_pkey" TO "live_session_pkey";--> statement-breakpoint
ALTER TABLE "live_session" RENAME CONSTRAINT "usage_record_user_id_user_id_fk" TO "live_session_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "live_session" RENAME COLUMN "created_at" TO "started_at";--> statement-breakpoint
ALTER INDEX "usage_record_user_created_idx" RENAME TO "live_session_user_started_idx";--> statement-breakpoint
ALTER TABLE "live_session" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "live_session" ADD COLUMN "cost_usd" numeric(14, 6) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "live_session" ADD COLUMN "credits_used" numeric(14, 6) DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "live_session" SET "cost_usd" = "cost_micros" / 1000000.0, "credits_used" = "credits_micros" / 1000000.0;--> statement-breakpoint
ALTER TABLE "live_session" DROP COLUMN "cost_micros";--> statement-breakpoint
ALTER TABLE "live_session" DROP COLUMN "credits_micros";--> statement-breakpoint

DROP TABLE "credit_grant";--> statement-breakpoint

CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"email" text,
	"type" text NOT NULL,
	"message" text NOT NULL
);--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notification" USING btree ("created_at");
