/**
 * EventPublisher — outbound port for recording domain events.
 *
 * Adapters implement this to persist events to a store. The kernel
 * emits events through this port without knowing where they go.
 */

import type { DomainEvent } from './event.js';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
