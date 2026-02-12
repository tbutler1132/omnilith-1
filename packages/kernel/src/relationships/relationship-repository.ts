/**
 * RelationshipRepository — outbound port for persisting relationships.
 */

import type { RelationshipId, UserId, OrganismId } from '../identity.js';
import type { Relationship, RelationshipType } from './relationship.js';

export interface RelationshipRepository {
  save(relationship: Relationship): Promise<void>;
  remove(id: RelationshipId): Promise<void>;
  findById(id: RelationshipId): Promise<Relationship | undefined>;
  findByUserAndOrganism(
    userId: UserId,
    organismId: OrganismId,
  ): Promise<ReadonlyArray<Relationship>>;
  findByOrganism(
    organismId: OrganismId,
    type?: RelationshipType,
  ): Promise<ReadonlyArray<Relationship>>;
  findByUser(
    userId: UserId,
    type?: RelationshipType,
  ): Promise<ReadonlyArray<Relationship>>;
}
