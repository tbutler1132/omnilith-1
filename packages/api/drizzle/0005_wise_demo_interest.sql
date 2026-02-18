CREATE TABLE IF NOT EXISTS "interest_signups" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source_panel" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"forwarded_at" timestamp with time zone,
	"forward_error" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_interest_signups_created_at" ON "interest_signups" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_interest_signups_email" ON "interest_signups" USING btree ("email");
