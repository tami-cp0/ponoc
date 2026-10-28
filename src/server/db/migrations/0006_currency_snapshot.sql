ALTER TABLE "purchase" ADD COLUMN "canonical_amount_cents" integer;
--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "canonical_currency" text DEFAULT 'cad';
--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "presentment_amount" integer;
--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "presentment_currency" text;
--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "presentment_source_amount" integer;
--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "presentment_source_currency" text;
--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "presentment_fx_rate" numeric(20, 10);
--> statement-breakpoint
UPDATE "purchase" SET "canonical_amount_cents" = "amount_cents", "canonical_currency" = lower("currency");
--> statement-breakpoint
ALTER TABLE "purchase" ALTER COLUMN "canonical_amount_cents" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase" ALTER COLUMN "canonical_currency" SET NOT NULL;
