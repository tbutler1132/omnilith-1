/**
 * PostgreSQL implementation of EventPublisher — persists events to the events table.
 */

import type { DomainEvent, EventPublisher } from '@omnilith/kernel';
import type { Database } from '../db/connection.js';
import { events } from '../db/schema.js';

export class PgEventPublisher implements EventPublisher {
  constructor(private readonly db: Database) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.db.insert(events).values({
      id: event.id,
      type: event.type,
      organismId: event.organismId,
      actorId: event.actorId,
      occurredAt: new Date(event.occurredAt),
      payload: event.payload,
    });
  }
}
