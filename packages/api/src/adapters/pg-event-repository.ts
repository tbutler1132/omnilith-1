/**
 * PostgreSQL implementation of EventRepository — reads events from the events table.
 */

import type { DomainEvent, EventId, EventRepository, EventType, OrganismId, Timestamp, UserId } from '@omnilith/kernel';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { events } from '../db/schema.js';

export class PgEventRepository implements EventRepository {
  constructor(private readonly db: Database) {}

  async findByOrganismId(organismId: OrganismId, type?: EventType): Promise<ReadonlyArray<DomainEvent>> {
    const conditions = [eq(events.organismId, organismId)];
    if (type) conditions.push(eq(events.type, type));
    const rows = await this.db
      .select()
      .from(events)
      .where(and(...conditions));
    return rows.map(toEvent);
  }
}

function toEvent(row: typeof events.$inferSelect): DomainEvent {
  return {
    id: row.id as EventId,
    type: row.type as EventType,
    organismId: row.organismId as OrganismId,
    actorId: row.actorId as UserId,
    occurredAt: row.occurredAt.getTime() as Timestamp,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}
