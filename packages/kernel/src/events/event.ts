/**
 * DomainEvent — an append-only record of something that happened.
 *
 * Every mutation in the kernel emits an event. Events are the
 * observable trace of the system's activity. They carry enough
 * data to reconstruct what happened without querying back.
 */

import type { EventId, OrganismId, UserId, Timestamp } from '../identity.js';

export type EventType =
  | 'organism.created'
  | 'state.appended'
  | 'organism.composed'
  | 'organism.decomposed'
  | 'proposal.opened'
  | 'proposal.integrated'
  | 'proposal.declined'
  | 'visibility.changed';

export interface DomainEvent {
  readonly id: EventId;
  readonly type: EventType;
  readonly organismId: OrganismId;
  readonly actorId: UserId;
  readonly occurredAt: Timestamp;
  readonly payload: Record<string, unknown>;
}
