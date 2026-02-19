/**
 * InMemoryEventPublisher — in-memory event publisher and repository.
 *
 * Captures emitted events for assertions so tests can verify mutation
 * observability without external event infrastructure.
 */

import type { DomainEvent, EventType } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { EventRepository } from '../events/event-repository.js';
import type { OrganismId } from '../identity.js';

export class InMemoryEventPublisher implements EventPublisher, EventRepository {
  readonly published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  async findByOrganismId(organismId: OrganismId, type?: EventType): Promise<ReadonlyArray<DomainEvent>> {
    return this.published.filter((e) => e.organismId === organismId && (!type || e.type === type));
  }

  clear(): void {
    this.published.length = 0;
  }

  findByType(type: DomainEvent['type']): DomainEvent[] {
    return this.published.filter((e) => e.type === type);
  }
}
