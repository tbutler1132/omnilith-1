/**
 * Database schema — Drizzle table definitions for PostgreSQL.
 *
 * This is the persistence layer. The kernel operates against ports;
 * these tables are the Postgres implementation of those ports.
 */

import { pgTable, text, timestamp, integer, boolean, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const organisms = pgTable('organisms', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  openTrunk: boolean('open_trunk').notNull().default(false),
  forkedFromId: text('forked_from_id').references((): any => organisms.id),
});

export const organismStates = pgTable('organism_states', {
  id: text('id').primaryKey(),
  organismId: text('organism_id').notNull().references(() => organisms.id),
  contentTypeId: text('content_type_id').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  sequenceNumber: integer('sequence_number').notNull(),
  parentStateId: text('parent_state_id').references((): any => organismStates.id),
}, (table) => [
  index('idx_organism_states_organism_id').on(table.organismId),
  index('idx_organism_states_sequence').on(table.organismId, table.sequenceNumber),
]);

export const composition = pgTable('composition', {
  parentId: text('parent_id').notNull().references(() => organisms.id),
  childId: text('child_id').notNull().references(() => organisms.id),
  composedAt: timestamp('composed_at', { withTimezone: true }).notNull(),
  composedBy: text('composed_by').notNull().references(() => users.id),
  position: integer('position'),
}, (table) => [
  uniqueIndex('composition_child_unique').on(table.childId),
  index('idx_composition_parent').on(table.parentId),
]);

export const proposals = pgTable('proposals', {
  id: text('id').primaryKey(),
  organismId: text('organism_id').notNull().references(() => organisms.id),
  proposedContentTypeId: text('proposed_content_type_id').notNull(),
  proposedPayload: jsonb('proposed_payload'),
  proposedBy: text('proposed_by').notNull().references(() => users.id),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by').references(() => users.id),
  declineReason: text('decline_reason'),
}, (table) => [
  index('idx_proposals_organism_id').on(table.organismId),
  index('idx_proposals_status').on(table.organismId, table.status),
]);

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  organismId: text('organism_id').notNull(),
  actorId: text('actor_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  payload: jsonb('payload'),
}, (table) => [
  index('idx_events_organism_id').on(table.organismId),
  index('idx_events_type').on(table.type),
]);

export const visibility = pgTable('visibility', {
  organismId: text('organism_id').primaryKey().references(() => organisms.id),
  level: text('level').notNull().default('public'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const relationships = pgTable('relationships', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  organismId: text('organism_id').notNull().references(() => organisms.id),
  role: text('role'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('idx_relationships_user_organism').on(table.userId, table.organismId),
  index('idx_relationships_organism').on(table.organismId),
  index('idx_relationships_user').on(table.userId),
]);
