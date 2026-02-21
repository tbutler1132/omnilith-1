CREATE TABLE "regulator_action_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"boundary_organism_id" text NOT NULL,
	"action_organism_id" text NOT NULL,
	"trigger_policy_organism_id" text NOT NULL,
	"execution_mode" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulator_runtime_events" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"boundary_organism_id" text,
	"action_organism_id" text,
	"execution_id" text,
	"stage" text NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "regulator_action_executions" ADD CONSTRAINT "regulator_action_executions_boundary_organism_id_organisms_id_fk" FOREIGN KEY ("boundary_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulator_action_executions" ADD CONSTRAINT "regulator_action_executions_action_organism_id_organisms_id_fk" FOREIGN KEY ("action_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulator_action_executions" ADD CONSTRAINT "regulator_action_executions_trigger_policy_organism_id_organisms_id_fk" FOREIGN KEY ("trigger_policy_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulator_runtime_events" ADD CONSTRAINT "regulator_runtime_events_boundary_organism_id_organisms_id_fk" FOREIGN KEY ("boundary_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulator_runtime_events" ADD CONSTRAINT "regulator_runtime_events_action_organism_id_organisms_id_fk" FOREIGN KEY ("action_organism_id") REFERENCES "public"."organisms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "regulator_action_executions_idempotency_unique" ON "regulator_action_executions" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "idx_regulator_action_executions_status_next_attempt" ON "regulator_action_executions" USING btree ("status","next_attempt_at");
--> statement-breakpoint
CREATE INDEX "idx_regulator_action_executions_boundary" ON "regulator_action_executions" USING btree ("boundary_organism_id");
--> statement-breakpoint
CREATE INDEX "idx_regulator_action_executions_action" ON "regulator_action_executions" USING btree ("action_organism_id");
--> statement-breakpoint
CREATE INDEX "idx_regulator_runtime_events_cycle" ON "regulator_runtime_events" USING btree ("cycle_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "idx_regulator_runtime_events_stage" ON "regulator_runtime_events" USING btree ("stage");
--> statement-breakpoint
CREATE INDEX "idx_regulator_runtime_events_boundary" ON "regulator_runtime_events" USING btree ("boundary_organism_id");
