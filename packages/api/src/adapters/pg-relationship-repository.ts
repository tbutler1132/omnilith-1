/**
 * PostgreSQL implementation of RelationshipRepository.
 */

import type {
  MembershipRole,
  OrganismId,
  Relationship,
  RelationshipId,
  RelationshipRepository,
  RelationshipType,
  Timestamp,
  UserId,
} from '@omnilith/kernel';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { relationships } from '../db/schema.js';

export class PgRelationshipRepository implements RelationshipRepository {
  constructor(private readonly db: Database) {}

  async save(relationship: Relationship): Promise<void> {
    await this.db.insert(relationships).values({
      id: relationship.id,
      type: relationship.type,
      userId: relationship.userId,
      organismId: relationship.organismId,
      role: relationship.role ?? null,
      createdAt: new Date(relationship.createdAt),
    });
  }

  async remove(id: RelationshipId): Promise<void> {
    await this.db.delete(relationships).where(eq(relationships.id, id));
  }

  async findById(id: RelationshipId): Promise<Relationship | undefined> {
    const rows = await this.db.select().from(relationships).where(eq(relationships.id, id));
    if (rows.length === 0) return undefined;
    return toRelationship(rows[0]);
  }

  async findByUserAndOrganism(userId: UserId, organismId: OrganismId): Promise<ReadonlyArray<Relationship>> {
    const rows = await this.db
      .select()
      .from(relationships)
      .where(and(eq(relationships.userId, userId), eq(relationships.organismId, organismId)));
    return rows.map(toRelationship);
  }

  async findByOrganism(organismId: OrganismId, type?: RelationshipType): Promise<ReadonlyArray<Relationship>> {
    const conditions = [eq(relationships.organismId, organismId)];
    if (type) conditions.push(eq(relationships.type, type));
    const rows = await this.db
      .select()
      .from(relationships)
      .where(and(...conditions));
    return rows.map(toRelationship);
  }

  async findByUser(userId: UserId, type?: RelationshipType): Promise<ReadonlyArray<Relationship>> {
    const conditions = [eq(relationships.userId, userId)];
    if (type) conditions.push(eq(relationships.type, type));
    const rows = await this.db
      .select()
      .from(relationships)
      .where(and(...conditions));
    return rows.map(toRelationship);
  }
}

function toRelationship(row: typeof relationships.$inferSelect): Relationship {
  return {
    id: row.id as RelationshipId,
    type: row.type as RelationshipType,
    userId: row.userId as UserId,
    organismId: row.organismId as OrganismId,
    role: row.role as MembershipRole | undefined,
    createdAt: row.createdAt.getTime() as Timestamp,
  };
}
