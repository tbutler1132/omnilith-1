/**
 * PostgreSQL implementation of QueryPort — cross-cutting retrieval.
 */

import {
  type ContentTypeId,
  decodeProposalMutation,
  type EventType,
  type OrganismContributions,
  type OrganismContributor,
  type OrganismId,
  type OrganismWithState,
  type Proposal,
  type ProposalId,
  type ProposalStatus,
  type QueryFilters,
  type QueryPort,
  type StateId,
  type Timestamp,
  toLegacyProposalFields,
  type UserId,
  type VitalityData,
} from '@omnilith/kernel';
import { and, count, desc, eq, max, type SQL, sql } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { composition, events, organismStates, organisms, proposals } from '../db/schema.js';

const VITALITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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

    if (filters.nameQuery) {
      const normalizedNameQuery = filters.nameQuery.trim().toLowerCase();
      if (normalizedNameQuery.length > 0) {
        conditions.push(sql`LOWER(${organisms.name}) LIKE ${`%${normalizedNameQuery}%`}`);
      }
    }

    if (filters.contentTypeId) {
      conditions.push(
        sql`${organisms.id} IN (
          SELECT os1.organism_id
          FROM organism_states AS os1
          WHERE os1.content_type_id = ${filters.contentTypeId}
            AND os1.sequence_number = (
              SELECT MAX(os2.sequence_number)
              FROM organism_states AS os2
              WHERE os2.organism_id = os1.organism_id
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
    const [proposalCount] = await this.db
      .select({ count: count() })
      .from(proposals)
      .where(and(eq(proposals.organismId, organismId), eq(proposals.status, 'open')));

    const [lastState] = await this.db
      .select({ createdAt: max(organismStates.createdAt) })
      .from(organismStates)
      .where(eq(organismStates.organismId, organismId));
    const [lastProposal] = await this.db
      .select({ createdAt: max(proposals.createdAt), resolvedAt: max(proposals.resolvedAt) })
      .from(proposals)
      .where(eq(proposals.organismId, organismId));
    const [lastEvent] = await this.db
      .select({ occurredAt: max(events.occurredAt) })
      .from(events)
      .where(eq(events.organismId, organismId));

    const candidateTimes = [
      lastState?.createdAt,
      lastProposal?.createdAt,
      lastProposal?.resolvedAt,
      lastEvent?.occurredAt,
    ]
      .filter((value): value is Date => value instanceof Date)
      .map((value) => value.getTime());
    const lastActivityAt = candidateTimes.length > 0 ? (Math.max(...candidateTimes) as Timestamp) : undefined;
    const windowStart = lastActivityAt !== undefined ? new Date(lastActivityAt - VITALITY_WINDOW_MS) : undefined;
    const recentStateChanges =
      windowStart === undefined
        ? 0
        : (
            await this.db
              .select({ count: count() })
              .from(organismStates)
              .where(and(eq(organismStates.organismId, organismId), sql`${organismStates.createdAt} >= ${windowStart}`))
          )[0].count;

    return {
      organismId,
      recentStateChanges,
      openProposalCount: proposalCount.count,
      lastActivityAt,
    };
  }

  async getOrganismContributions(organismId: OrganismId): Promise<OrganismContributions> {
    const stateRows = await this.db
      .select({
        userId: organismStates.createdBy,
        count: count(),
        lastContributedAt: max(organismStates.createdAt),
      })
      .from(organismStates)
      .where(eq(organismStates.organismId, organismId))
      .groupBy(organismStates.createdBy);

    const proposalRows = await this.db
      .select({
        userId: proposals.proposedBy,
        count: count(),
        lastContributedAt: max(proposals.createdAt),
      })
      .from(proposals)
      .where(eq(proposals.organismId, organismId))
      .groupBy(proposals.proposedBy);

    const integrationRows = await this.db
      .select({
        userId: proposals.resolvedBy,
        count: count(),
        lastContributedAt: max(proposals.resolvedAt),
      })
      .from(proposals)
      .where(and(eq(proposals.organismId, organismId), eq(proposals.status, 'integrated')))
      .groupBy(proposals.resolvedBy);

    const declineRows = await this.db
      .select({
        userId: proposals.resolvedBy,
        count: count(),
        lastContributedAt: max(proposals.resolvedAt),
      })
      .from(proposals)
      .where(and(eq(proposals.organismId, organismId), eq(proposals.status, 'declined')))
      .groupBy(proposals.resolvedBy);

    const eventRows = await this.db
      .select({
        userId: events.actorId,
        type: events.type,
        count: count(),
        lastContributedAt: max(events.occurredAt),
      })
      .from(events)
      .where(eq(events.organismId, organismId))
      .groupBy(events.actorId, events.type);

    const byUser = new Map<UserId, OrganismContributor>();

    const ensureContributor = (userId: UserId): OrganismContributor => {
      const existing = byUser.get(userId);
      if (existing) return existing;
      const created: OrganismContributor = {
        userId,
        stateCount: 0,
        proposalCount: 0,
        integrationCount: 0,
        declineCount: 0,
        eventCount: 0,
        eventTypeCounts: {},
      };
      byUser.set(userId, created);
      return created;
    };

    const mergeLastContributedAt = (contributor: OrganismContributor, lastContributedAt: Date | null) => {
      if (!lastContributedAt) return contributor;
      const timestamp = lastContributedAt.getTime() as Timestamp;
      return {
        ...contributor,
        lastContributedAt:
          contributor.lastContributedAt === undefined
            ? timestamp
            : (Math.max(contributor.lastContributedAt, timestamp) as Timestamp),
      };
    };

    for (const row of stateRows) {
      const userId = row.userId as UserId;
      const contributor = ensureContributor(userId);
      byUser.set(
        userId,
        mergeLastContributedAt(
          {
            ...contributor,
            stateCount: contributor.stateCount + row.count,
          },
          row.lastContributedAt,
        ),
      );
    }

    for (const row of proposalRows) {
      const userId = row.userId as UserId;
      const contributor = ensureContributor(userId);
      byUser.set(
        userId,
        mergeLastContributedAt(
          {
            ...contributor,
            proposalCount: contributor.proposalCount + row.count,
          },
          row.lastContributedAt,
        ),
      );
    }

    for (const row of integrationRows) {
      if (!row.userId) continue;
      const userId = row.userId as UserId;
      const contributor = ensureContributor(userId);
      byUser.set(
        userId,
        mergeLastContributedAt(
          {
            ...contributor,
            integrationCount: contributor.integrationCount + row.count,
          },
          row.lastContributedAt,
        ),
      );
    }

    for (const row of declineRows) {
      if (!row.userId) continue;
      const userId = row.userId as UserId;
      const contributor = ensureContributor(userId);
      byUser.set(
        userId,
        mergeLastContributedAt(
          {
            ...contributor,
            declineCount: contributor.declineCount + row.count,
          },
          row.lastContributedAt,
        ),
      );
    }

    for (const row of eventRows) {
      const userId = row.userId as UserId;
      const contributor = ensureContributor(userId);
      const currentTypeCount = contributor.eventTypeCounts[row.type as EventType] ?? 0;
      const eventTypeCounts = {
        ...contributor.eventTypeCounts,
        [row.type as EventType]: currentTypeCount + row.count,
      } as Readonly<Partial<Record<EventType, number>>>;

      byUser.set(
        userId,
        mergeLastContributedAt(
          {
            ...contributor,
            eventCount: contributor.eventCount + row.count,
            eventTypeCounts,
          },
          row.lastContributedAt,
        ),
      );
    }

    const contributors = [...byUser.values()].sort((a, b) => {
      const totalA = a.stateCount + a.proposalCount + a.integrationCount + a.declineCount + a.eventCount;
      const totalB = b.stateCount + b.proposalCount + b.integrationCount + b.declineCount + b.eventCount;
      if (totalA !== totalB) return totalB - totalA;
      const lastA = a.lastContributedAt ?? 0;
      const lastB = b.lastContributedAt ?? 0;
      if (lastA !== lastB) return lastB - lastA;
      return a.userId.localeCompare(b.userId);
    });

    return {
      organismId,
      contributors,
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
    const rows = await this.db.select().from(proposals).where(eq(proposals.proposedBy, userId));

    return rows.map(toProposal);
  }
}

function toProposal(row: typeof proposals.$inferSelect): Proposal {
  const mutation = decodeProposalMutation({
    proposedContentTypeId: row.proposedContentTypeId,
    proposedPayload: row.proposedPayload,
  });
  const legacy = toLegacyProposalFields(mutation);
  return {
    id: row.id as ProposalId,
    organismId: row.organismId as OrganismId,
    mutation,
    proposedContentTypeId: legacy.proposedContentTypeId,
    proposedPayload: legacy.proposedPayload,
    description: row.description ?? undefined,
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
