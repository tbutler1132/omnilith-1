CREATE TABLE IF NOT EXISTS "github_issue_dispatches" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"organism_id" text NOT NULL,
	"repository_organism_id" text NOT NULL,
	"integrated_by" text NOT NULL,
	"issue_title" text NOT NULL,
	"issue_body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_issue_dispatches_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "github_issue_dispatches_organism_id_organisms_id_fk" FOREIGN KEY ("organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "github_issue_dispatches_repository_organism_id_organisms_id_fk" FOREIGN KEY ("repository_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "github_issue_dispatches_integrated_by_users_id_fk" FOREIGN KEY ("integrated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_issue_links" (
	"proposal_id" text PRIMARY KEY NOT NULL,
	"issue_organism_id" text NOT NULL,
	"repository_organism_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"github_owner" text NOT NULL,
	"github_repo" text NOT NULL,
	"github_issue_number" integer NOT NULL,
	"github_issue_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_issue_links_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "github_issue_links_issue_organism_id_organisms_id_fk" FOREIGN KEY ("issue_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "github_issue_links_repository_organism_id_organisms_id_fk" FOREIGN KEY ("repository_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "github_issue_links_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "github_issue_dispatches_proposal_unique" ON "github_issue_dispatches" USING btree ("proposal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_github_issue_dispatches_status_next_attempt" ON "github_issue_dispatches" USING btree ("status","next_attempt_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_github_issue_dispatches_repository" ON "github_issue_dispatches" USING btree ("repository_organism_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "github_issue_links_issue_organism_unique" ON "github_issue_links" USING btree ("issue_organism_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "github_issue_links_external_issue_unique" ON "github_issue_links" USING btree ("github_owner","github_repo","github_issue_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_github_issue_links_repository" ON "github_issue_links" USING btree ("repository_organism_id");
