ALTER TABLE "purchase" DROP COLUMN IF EXISTS "canonical_amount_cents";
--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "canonical_currency";
--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "presentment_amount";
--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "presentment_currency";
--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "presentment_source_amount";
--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "presentment_source_currency";
--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "presentment_fx_rate";
