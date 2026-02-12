/**
 * PostgreSQL implementation of VisibilityRepository.
 */

import type { OrganismId, Timestamp, VisibilityLevel, VisibilityRecord, VisibilityRepository } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { visibility } from '../db/schema.js';

export class PgVisibilityRepository implements VisibilityRepository {
  constructor(private readonly db: Database) {}

  async save(record: VisibilityRecord): Promise<void> {
    await this.db
      .insert(visibility)
      .values({
        organismId: record.organismId,
        level: record.level,
        updatedAt: new Date(record.updatedAt),
      })
      .onConflictDoUpdate({
        target: visibility.organismId,
        set: {
          level: record.level,
          updatedAt: new Date(record.updatedAt),
        },
      });
  }

  async findByOrganismId(organismId: OrganismId): Promise<VisibilityRecord | undefined> {
    const rows = await this.db.select().from(visibility).where(eq(visibility.organismId, organismId));
    if (rows.length === 0) return undefined;
    return {
      organismId: rows[0].organismId as OrganismId,
      level: rows[0].level as VisibilityLevel,
      updatedAt: rows[0].updatedAt.getTime() as Timestamp,
    };
  }
}
