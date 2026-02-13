/**
 * PostgreSQL implementation of OrganismRepository.
 */

import type { Organism, OrganismId, OrganismRepository, Timestamp, UserId } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { organisms } from '../db/schema.js';

export class PgOrganismRepository implements OrganismRepository {
  constructor(private readonly db: Database) {}

  async save(organism: Organism): Promise<void> {
    await this.db.insert(organisms).values({
      id: organism.id,
      createdAt: new Date(organism.createdAt),
      createdBy: organism.createdBy,
      openTrunk: organism.openTrunk,
      forkedFromId: organism.forkedFromId ?? null,
    });
  }

  async findById(id: OrganismId): Promise<Organism | undefined> {
    const rows = await this.db.select().from(organisms).where(eq(organisms.id, id));
    if (rows.length === 0) return undefined;
    return toOrganism(rows[0]);
  }

  async exists(id: OrganismId): Promise<boolean> {
    const rows = await this.db.select({ id: organisms.id }).from(organisms).where(eq(organisms.id, id));
    return rows.length > 0;
  }
}

function toOrganism(row: typeof organisms.$inferSelect): Organism {
  return {
    id: row.id as OrganismId,
    createdAt: row.createdAt.getTime() as Timestamp,
    createdBy: row.createdBy as UserId,
    openTrunk: row.openTrunk,
    forkedFromId: row.forkedFromId as OrganismId | undefined,
  };
}
