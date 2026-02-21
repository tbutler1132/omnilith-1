/**
 * Database schema — Drizzle table definitions for PostgreSQL.
 *
 * This is the persistence layer. The kernel operates against ports;
 * these tables are the Postgres implementation of those ports.
 */

import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const organisms = pgTable('organisms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  openTrunk: boolean('open_trunk').notNull().default(false),
  forkedFromId: text('forked_from_id').references((): AnyPgColumn => organisms.id),
});

export const organismStates = pgTable(
  'organism_states',
  {
    id: text('id').primaryKey(),
    organismId: text('organism_id')
      .notNull()
      .references(() => organisms.id),
    contentTypeId: text('content_type_id').notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    sequenceNumber: integer('sequence_number').notNull(),
    parentStateId: text('parent_state_id').references((): AnyPgColumn => organismStates.id),
  },
  (table) => [
    index('idx_organism_states_organism_id').on(table.organismId),
    index('idx_organism_states_sequence').on(table.organismId, table.sequenceNumber),
    uniqueIndex('organism_states_organism_sequence_unique').on(table.organismId, table.sequenceNumber),
  ],
);

export const composition = pgTable(
  'composition',
  {
    parentId: text('parent_id')
      .notNull()
      .references(() => organisms.id),
    childId: text('child_id')
      .notNull()
      .references(() => organisms.id),
    composedAt: timestamp('composed_at', { withTimezone: true }).notNull(),
    composedBy: text('composed_by')
      .notNull()
      .references(() => users.id),
    position: integer('position'),
  },
  (table) => [
    uniqueIndex('composition_child_unique').on(table.childId),
    index('idx_composition_parent').on(table.parentId),
  ],
);

export const proposals = pgTable(
  'proposals',
  {
    id: text('id').primaryKey(),
    organismId: text('organism_id')
      .notNull()
      .references(() => organisms.id),
    proposedContentTypeId: text('proposed_content_type_id').notNull(),
    proposedPayload: jsonb('proposed_payload'),
    description: text('description'),
    proposedBy: text('proposed_by')
      .notNull()
      .references(() => users.id),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by').references(() => users.id),
    declineReason: text('decline_reason'),
  },
  (table) => [
    index('idx_proposals_organism_id').on(table.organismId),
    index('idx_proposals_status').on(table.organismId, table.status),
  ],
);

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    organismId: text('organism_id').notNull(),
    actorId: text('actor_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload'),
  },
  (table) => [index('idx_events_organism_id').on(table.organismId), index('idx_events_type').on(table.type)],
);

export const visibility = pgTable('visibility', {
  organismId: text('organism_id')
    .primaryKey()
    .references(() => organisms.id),
  level: text('level').notNull().default('public'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const relationships = pgTable(
  'relationships',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    organismId: text('organism_id')
      .notNull()
      .references(() => organisms.id),
    role: text('role'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_relationships_user_organism').on(table.userId, table.organismId),
    index('idx_relationships_organism').on(table.organismId),
    index('idx_relationships_user').on(table.userId),
  ],
);

export const platformConfig = pgTable('platform_config', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
});

export const githubIssueDispatches = pgTable(
  'github_issue_dispatches',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id')
      .notNull()
      .references(() => proposals.id),
    organismId: text('organism_id')
      .notNull()
      .references(() => organisms.id),
    repositoryOrganismId: text('repository_organism_id')
      .notNull()
      .references(() => organisms.id),
    integratedBy: text('integrated_by')
      .notNull()
      .references(() => users.id),
    issueTitle: text('issue_title').notNull(),
    issueBody: text('issue_body').notNull(),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('github_issue_dispatches_proposal_unique').on(table.proposalId),
    index('idx_github_issue_dispatches_status_next_attempt').on(table.status, table.nextAttemptAt),
    index('idx_github_issue_dispatches_repository').on(table.repositoryOrganismId),
  ],
);

export const githubIssueLinks = pgTable(
  'github_issue_links',
  {
    proposalId: text('proposal_id')
      .primaryKey()
      .references(() => proposals.id),
    issueOrganismId: text('issue_organism_id')
      .notNull()
      .references(() => organisms.id),
    repositoryOrganismId: text('repository_organism_id')
      .notNull()
      .references(() => organisms.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),
    githubOwner: text('github_owner').notNull(),
    githubRepo: text('github_repo').notNull(),
    githubIssueNumber: integer('github_issue_number').notNull(),
    githubIssueUrl: text('github_issue_url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('github_issue_links_issue_organism_unique').on(table.issueOrganismId),
    uniqueIndex('github_issue_links_external_issue_unique').on(
      table.githubOwner,
      table.githubRepo,
      table.githubIssueNumber,
    ),
    index('idx_github_issue_links_repository').on(table.repositoryOrganismId),
  ],
);

export const regulatorActionExecutions = pgTable(
  'regulator_action_executions',
  {
    id: text('id').primaryKey(),
    boundaryOrganismId: text('boundary_organism_id')
      .notNull()
      .references(() => organisms.id),
    actionOrganismId: text('action_organism_id')
      .notNull()
      .references(() => organisms.id),
    triggerPolicyOrganismId: text('trigger_policy_organism_id')
      .notNull()
      .references(() => organisms.id),
    executionMode: text('execution_mode').notNull(),
    status: text('status').notNull().default('pending'),
    idempotencyKey: text('idempotency_key').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lastError: text('last_error'),
    result: jsonb('result'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('regulator_action_executions_idempotency_unique').on(table.idempotencyKey),
    index('idx_regulator_action_executions_status_next_attempt').on(table.status, table.nextAttemptAt),
    index('idx_regulator_action_executions_boundary').on(table.boundaryOrganismId),
    index('idx_regulator_action_executions_action').on(table.actionOrganismId),
  ],
);

export const regulatorRuntimeEvents = pgTable(
  'regulator_runtime_events',
  {
    id: text('id').primaryKey(),
    cycleId: text('cycle_id').notNull(),
    boundaryOrganismId: text('boundary_organism_id').references(() => organisms.id),
    actionOrganismId: text('action_organism_id').references(() => organisms.id),
    executionId: text('execution_id'),
    stage: text('stage').notNull(),
    payload: jsonb('payload'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_regulator_runtime_events_cycle').on(table.cycleId, table.occurredAt),
    index('idx_regulator_runtime_events_stage').on(table.stage),
    index('idx_regulator_runtime_events_boundary').on(table.boundaryOrganismId),
  ],
);

export const interestSignups = pgTable(
  'interest_signups',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    sourcePanel: text('source_panel').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    forwardedAt: timestamp('forwarded_at', { withTimezone: true }),
    forwardError: text('forward_error'),
  },
  (table) => [
    index('idx_interest_signups_created_at').on(table.createdAt),
    index('idx_interest_signups_email').on(table.email),
  ],
);
