CREATE TABLE "credit_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credits_micros" bigint NOT NULL,
	"reason" text NOT NULL,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_grant_user_idx" ON "credit_grant" USING btree ("user_id");