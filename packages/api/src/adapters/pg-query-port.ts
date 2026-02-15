/**
 * PostgreSQL implementation of QueryPort — cross-cutting retrieval.
 */

import type {
  ContentTypeId,
  OrganismId,
  OrganismWithState,
  Proposal,
  ProposalId,
  ProposalStatus,
  QueryFilters,
  QueryPort,
  StateId,
  Timestamp,
  UserId,
  VitalityData,
} from '@omnilith/kernel';
import { and, count, desc, eq, max, or, type SQL, sql } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { composition, organismStates, organisms, proposals, relationships } from '../db/schema.js';

export class PgQueryPort implements QueryPort {
  constructor(private readonly db: Database) {}

  async findOrganismsWithState(filters: QueryFilters): Promise<ReadonlyArray<OrganismWithState>> {
    const conditions: SQL[] = [];

    if (filters.createdBy) {
      conditions.push(eq(organisms.createdBy, filters.createdBy));
    }

    if (filters.parentId) {
      conditions.push(
        sql`${organisms.id} IN (SELECT ${composition.childId} FROM ${composition} WHERE ${composition.parentId} = ${filters.parentId})`,
      );
    }

    if (filters.contentTypeId) {
      conditions.push(
        sql`${organisms.id} IN (
          SELECT os1.${organismStates.organismId} FROM ${organismStates} os1
          WHERE os1.${organismStates.contentTypeId} = ${filters.contentTypeId}
          AND os1.${organismStates.sequenceNumber} = (
            SELECT MAX(os2.${organismStates.sequenceNumber})
            FROM ${organismStates} os2
            WHERE os2.${organismStates.organismId} = os1.${organismStates.organismId}
          )
        )`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const base = this.db.select().from(organisms);
    const rows = where ? await base.where(where).limit(limit).offset(offset) : await base.limit(limit).offset(offset);

    const results: OrganismWithState[] = [];
    for (const row of rows) {
      const stateRows = await this.db
        .select()
        .from(organismStates)
        .where(eq(organismStates.organismId, row.id))
        .orderBy(desc(organismStates.sequenceNumber))
        .limit(1);

      results.push({
        organism: toOrganism(row),
        currentState: stateRows.length > 0 ? toState(stateRows[0]) : undefined,
      });
    }

    return results;
  }

  async getVitality(organismId: OrganismId): Promise<VitalityData> {
    const [stateCount] = await this.db
      .select({ count: count() })
      .from(organismStates)
      .where(eq(organismStates.organismId, organismId));

    const [proposalCount] = await this.db
      .select({ count: count() })
      .from(proposals)
      .where(and(eq(proposals.organismId, organismId), eq(proposals.status, 'open')));

    const [lastState] = await this.db
      .select({ createdAt: max(organismStates.createdAt) })
      .from(organismStates)
      .where(eq(organismStates.organismId, organismId));

    return {
      organismId,
      recentStateChanges: stateCount.count,
      openProposalCount: proposalCount.count,
      lastActivityAt: lastState?.createdAt?.getTime() as Timestamp | undefined,
    };
  }

  async findOrganismsByUser(userId: UserId): Promise<ReadonlyArray<OrganismWithState>> {
    const rows = await this.db.select().from(organisms).where(eq(organisms.createdBy, userId));

    const results: OrganismWithState[] = [];
    for (const row of rows) {
      const stateRows = await this.db
        .select()
        .from(organismStates)
        .where(eq(organismStates.organismId, row.id))
        .orderBy(desc(organismStates.sequenceNumber))
        .limit(1);

      results.push({
        organism: toOrganism(row),
        currentState: stateRows.length > 0 ? toState(stateRows[0]) : undefined,
      });
    }

    return results;
  }

  async findProposalsByUser(userId: UserId): Promise<ReadonlyArray<Proposal>> {
    const rows = await this.db
      .select()
      .from(proposals)
      .where(
        or(
          eq(proposals.proposedBy, userId),
          sql`${proposals.organismId} IN (
            SELECT ${relationships.organismId} FROM ${relationships}
            WHERE ${relationships.userId} = ${userId}
            AND ${relationships.type} = 'integration-authority'
          )`,
        ),
      );

    return rows.map(toProposal);
  }
}

function toProposal(row: typeof proposals.$inferSelect): Proposal {
  return {
    id: row.id as ProposalId,
    organismId: row.organismId as OrganismId,
    proposedContentTypeId: row.proposedContentTypeId as ContentTypeId,
    proposedPayload: row.proposedPayload,
    proposedBy: row.proposedBy as UserId,
    status: row.status as ProposalStatus,
    createdAt: row.createdAt.getTime() as Timestamp,
    resolvedAt: row.resolvedAt ? (row.resolvedAt.getTime() as Timestamp) : undefined,
    resolvedBy: row.resolvedBy ? (row.resolvedBy as UserId) : undefined,
    declineReason: row.declineReason ?? undefined,
  };
}

function toOrganism(row: typeof organisms.$inferSelect): import('@omnilith/kernel').Organism {
  return {
    id: row.id as OrganismId,
    name: row.name,
    createdAt: row.createdAt.getTime() as Timestamp,
    createdBy: row.createdBy as UserId,
    openTrunk: row.openTrunk,
    forkedFromId: row.forkedFromId as OrganismId | undefined,
  };
}

function toState(row: typeof organismStates.$inferSelect): import('@omnilith/kernel').OrganismState {
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
