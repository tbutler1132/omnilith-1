import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';

export class InMemoryEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  clear(): void {
    this.published.length = 0;
  }

  findByType(type: DomainEvent['type']): DomainEvent[] {
    return this.published.filter((e) => e.type === type);
  }
}
