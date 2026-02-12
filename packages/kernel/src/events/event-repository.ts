/**
 * EventRepository — inbound port for reading domain events.
 *
 * The EventPublisher writes events. This port reads them back.
 * The rendering layer needs this to display activity on organisms.
 */

import type { OrganismId } from '../identity.js';
import type { DomainEvent, EventType } from './event.js';

export interface EventRepository {
  findByOrganismId(organismId: OrganismId, type?: EventType): Promise<ReadonlyArray<DomainEvent>>;
}
