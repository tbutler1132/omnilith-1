CREATE TABLE "composition" (
	"parent_id" text NOT NULL,
	"child_id" text NOT NULL,
	"composed_at" timestamp with time zone NOT NULL,
	"composed_by" text NOT NULL,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"organism_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "organism_states" (
	"id" text PRIMARY KEY NOT NULL,
	"organism_id" text NOT NULL,
	"content_type_id" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"parent_state_id" text
);
--> statement-breakpoint
CREATE TABLE "organisms" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"open_trunk" boolean DEFAULT false NOT NULL,
	"forked_from_id" text
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"organism_id" text NOT NULL,
	"proposed_content_type_id" text NOT NULL,
	"proposed_payload" jsonb,
	"proposed_by" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"decline_reason" text
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"organism_id" text NOT NULL,
	"role" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visibility" (
	"organism_id" text PRIMARY KEY NOT NULL,
	"level" text DEFAULT 'public' NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "composition" ADD CONSTRAINT "composition_parent_id_organisms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition" ADD CONSTRAINT "composition_child_id_organisms_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition" ADD CONSTRAINT "composition_composed_by_users_id_fk" FOREIGN KEY ("composed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organism_states" ADD CONSTRAINT "organism_states_organism_id_organisms_id_fk" FOREIGN KEY ("organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organism_states" ADD CONSTRAINT "organism_states_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organism_states" ADD CONSTRAINT "organism_states_parent_state_id_organism_states_id_fk" FOREIGN KEY ("parent_state_id") REFERENCES "public"."organism_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisms" ADD CONSTRAINT "organisms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisms" ADD CONSTRAINT "organisms_forked_from_id_organisms_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organism_id_organisms_id_fk" FOREIGN KEY ("organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_organism_id_organisms_id_fk" FOREIGN KEY ("organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visibility" ADD CONSTRAINT "visibility_organism_id_organisms_id_fk" FOREIGN KEY ("organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "composition_child_unique" ON "composition" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "idx_composition_parent" ON "composition" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_events_organism_id" ON "events" USING btree ("organism_id");--> statement-breakpoint
CREATE INDEX "idx_events_type" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_organism_states_organism_id" ON "organism_states" USING btree ("organism_id");--> statement-breakpoint
CREATE INDEX "idx_organism_states_sequence" ON "organism_states" USING btree ("organism_id","sequence_number");--> statement-breakpoint
CREATE INDEX "idx_proposals_organism_id" ON "proposals" USING btree ("organism_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_status" ON "proposals" USING btree ("organism_id","status");--> statement-breakpoint
CREATE INDEX "idx_relationships_user_organism" ON "relationships" USING btree ("user_id","organism_id");--> statement-breakpoint
CREATE INDEX "idx_relationships_organism" ON "relationships" USING btree ("organism_id");--> statement-breakpoint
CREATE INDEX "idx_relationships_user" ON "relationships" USING btree ("user_id");