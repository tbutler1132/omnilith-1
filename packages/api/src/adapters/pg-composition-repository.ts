/**
 * PostgreSQL implementation of CompositionRepository.
 */

import type { CompositionRecord, CompositionRepository, OrganismId, Timestamp, UserId } from '@omnilith/kernel';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { composition } from '../db/schema.js';

export class PgCompositionRepository implements CompositionRepository {
  constructor(private readonly db: Database) {}

  async save(record: CompositionRecord): Promise<void> {
    await this.db.insert(composition).values({
      parentId: record.parentId,
      childId: record.childId,
      composedAt: new Date(record.composedAt),
      composedBy: record.composedBy,
      position: record.position ?? null,
    });
  }

  async remove(parentId: OrganismId, childId: OrganismId): Promise<void> {
    await this.db.delete(composition).where(and(eq(composition.parentId, parentId), eq(composition.childId, childId)));
  }

  async findChildren(parentId: OrganismId): Promise<ReadonlyArray<CompositionRecord>> {
    const rows = await this.db.select().from(composition).where(eq(composition.parentId, parentId));
    return rows.map(toRecord);
  }

  async findParent(childId: OrganismId): Promise<CompositionRecord | undefined> {
    const rows = await this.db.select().from(composition).where(eq(composition.childId, childId));
    if (rows.length === 0) return undefined;
    return toRecord(rows[0]);
  }

  async exists(parentId: OrganismId, childId: OrganismId): Promise<boolean> {
    const rows = await this.db
      .select({ childId: composition.childId })
      .from(composition)
      .where(and(eq(composition.parentId, parentId), eq(composition.childId, childId)));
    return rows.length > 0;
  }
}

function toRecord(row: typeof composition.$inferSelect): CompositionRecord {
  return {
    parentId: row.parentId as OrganismId,
    childId: row.childId as OrganismId,
    composedAt: row.composedAt.getTime() as Timestamp,
    composedBy: row.composedBy as UserId,
    position: row.position ?? undefined,
  };
}
