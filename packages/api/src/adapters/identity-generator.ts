/**
 * Identity generator — produces unique IDs for all domain entities.
 */

import { randomUUID } from 'node:crypto';
import type {
  IdentityGenerator,
  OrganismId,
  UserId,
  StateId,
  ProposalId,
  EventId,
  RelationshipId,
  Timestamp,
} from '@omnilith/kernel';

export class UuidIdentityGenerator implements IdentityGenerator {
  organismId(): OrganismId {
    return randomUUID() as OrganismId;
  }
  userId(): UserId {
    return randomUUID() as UserId;
  }
  stateId(): StateId {
    return randomUUID() as StateId;
  }
  proposalId(): ProposalId {
    return randomUUID() as ProposalId;
  }
  eventId(): EventId {
    return randomUUID() as EventId;
  }
  relationshipId(): RelationshipId {
    return randomUUID() as RelationshipId;
  }
  timestamp(): Timestamp {
    return Date.now() as Timestamp;
  }
}
