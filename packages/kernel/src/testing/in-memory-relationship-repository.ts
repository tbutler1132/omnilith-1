import type { RelationshipId, UserId, OrganismId } from '../identity.js';
import type { Relationship, RelationshipType } from '../relationships/relationship.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';

export class InMemoryRelationshipRepository implements RelationshipRepository {
  private relationships = new Map<RelationshipId, Relationship>();

  async save(relationship: Relationship): Promise<void> {
    this.relationships.set(relationship.id, relationship);
  }

  async remove(id: RelationshipId): Promise<void> {
    this.relationships.delete(id);
  }

  async findById(id: RelationshipId): Promise<Relationship | undefined> {
    return this.relationships.get(id);
  }

  async findByUserAndOrganism(
    userId: UserId,
    organismId: OrganismId,
  ): Promise<ReadonlyArray<Relationship>> {
    return [...this.relationships.values()].filter(
      (r) => r.userId === userId && r.organismId === organismId,
    );
  }

  async findByOrganism(
    organismId: OrganismId,
    type?: RelationshipType,
  ): Promise<ReadonlyArray<Relationship>> {
    return [...this.relationships.values()].filter(
      (r) => r.organismId === organismId && (!type || r.type === type),
    );
  }

  async findByUser(
    userId: UserId,
    type?: RelationshipType,
  ): Promise<ReadonlyArray<Relationship>> {
    return [...this.relationships.values()].filter(
      (r) => r.userId === userId && (!type || r.type === type),
    );
  }
}
