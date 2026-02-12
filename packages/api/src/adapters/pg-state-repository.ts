/**
 * PostgreSQL implementation of StateRepository.
 */

import { eq, desc } from 'drizzle-orm';
import type { StateId, OrganismId, ContentTypeId, Timestamp, UserId } from '@omnilith/kernel';
import type { OrganismState, StateRepository } from '@omnilith/kernel';
import type { Database } from '../db/connection.js';
import { organismStates } from '../db/schema.js';

export class PgStateRepository implements StateRepository {
  constructor(private readonly db: Database) {}

  async append(state: OrganismState): Promise<void> {
    await this.db.insert(organismStates).values({
      id: state.id,
      organismId: state.organismId,
      contentTypeId: state.contentTypeId,
      payload: state.payload,
      createdAt: new Date(state.createdAt),
      createdBy: state.createdBy,
      sequenceNumber: state.sequenceNumber,
      parentStateId: state.parentStateId ?? null,
    });
  }

  async findById(id: StateId): Promise<OrganismState | undefined> {
    const rows = await this.db.select().from(organismStates).where(eq(organismStates.id, id));
    if (rows.length === 0) return undefined;
    return toState(rows[0]);
  }

  async findCurrentByOrganismId(organismId: OrganismId): Promise<OrganismState | undefined> {
    const rows = await this.db.select()
      .from(organismStates)
      .where(eq(organismStates.organismId, organismId))
      .orderBy(desc(organismStates.sequenceNumber))
      .limit(1);
    if (rows.length === 0) return undefined;
    return toState(rows[0]);
  }

  async findHistoryByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<OrganismState>> {
    const rows = await this.db.select()
      .from(organismStates)
      .where(eq(organismStates.organismId, organismId))
      .orderBy(organismStates.sequenceNumber);
    return rows.map(toState);
  }
}

function toState(row: typeof organismStates.$inferSelect): OrganismState {
  return {
    id: row.id as StateId,
    organismId: row.organismId as OrganismId,
    contentTypeId: row.contentTypeId as ContentTypeId,
    payload: row.payload,
    createdAt: row.createdAt.getTime() as Timestamp,
    createdBy: row.createdBy as UserId,
    sequenceNumber: row.sequenceNumber,
    parentStateId: row.parentStateId as StateId | undefined,
  };
}
