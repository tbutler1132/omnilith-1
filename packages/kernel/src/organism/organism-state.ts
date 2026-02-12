/**
 * OrganismState — an immutable snapshot of an organism's current manifestation.
 *
 * States are self-describing — each carries its own content type and payload.
 * The content type lives on the state, not the organism, so an organism's
 * type can change across states. States are append-only; the sequence of
 * all states is the organism's visible trace of identity.
 *
 * parentStateId accommodates Phase 2 branching. In Phase 1, it always
 * points to the previous state (linear history).
 */

import type { StateId, OrganismId, ContentTypeId, UserId, Timestamp } from '../identity.js';

export interface OrganismState {
  readonly id: StateId;
  readonly organismId: OrganismId;
  readonly contentTypeId: ContentTypeId;
  readonly payload: unknown;
  readonly createdAt: Timestamp;
  readonly createdBy: UserId;
  readonly sequenceNumber: number;
  readonly parentStateId?: StateId;
}
