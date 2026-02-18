/**
 * PostgreSQL implementation of ProposalRepository.
 */

import type {
  ContentTypeId,
  OrganismId,
  Proposal,
  ProposalId,
  ProposalRepository,
  Timestamp,
  UserId,
} from '@omnilith/kernel';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { proposals } from '../db/schema.js';

export class PgProposalRepository implements ProposalRepository {
  constructor(private readonly db: Database) {}

  async save(proposal: Proposal): Promise<void> {
    await this.db.insert(proposals).values({
      id: proposal.id,
      organismId: proposal.organismId,
      proposedContentTypeId: proposal.proposedContentTypeId,
      proposedPayload: proposal.proposedPayload,
      description: proposal.description ?? null,
      proposedBy: proposal.proposedBy,
      status: proposal.status,
      createdAt: new Date(proposal.createdAt),
      resolvedAt: proposal.resolvedAt ? new Date(proposal.resolvedAt) : null,
      resolvedBy: proposal.resolvedBy ?? null,
      declineReason: proposal.declineReason ?? null,
    });
  }

  async update(proposal: Proposal): Promise<boolean> {
    const result =
      proposal.status === 'open'
        ? await this.db
            .update(proposals)
            .set({
              status: proposal.status,
              resolvedAt: proposal.resolvedAt ? new Date(proposal.resolvedAt) : null,
              resolvedBy: proposal.resolvedBy ?? null,
              declineReason: proposal.declineReason ?? null,
            })
            .where(eq(proposals.id, proposal.id))
            .returning({ id: proposals.id })
        : await this.db
            .update(proposals)
            .set({
              status: proposal.status,
              resolvedAt: proposal.resolvedAt ? new Date(proposal.resolvedAt) : null,
              resolvedBy: proposal.resolvedBy ?? null,
              declineReason: proposal.declineReason ?? null,
            })
            .where(and(eq(proposals.id, proposal.id), eq(proposals.status, 'open')))
            .returning({ id: proposals.id });

    return result.length > 0;
  }

  async findById(id: ProposalId): Promise<Proposal | undefined> {
    const rows = await this.db.select().from(proposals).where(eq(proposals.id, id));
    if (rows.length === 0) return undefined;
    return toProposal(rows[0]);
  }

  async findByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>> {
    const rows = await this.db.select().from(proposals).where(eq(proposals.organismId, organismId));
    return rows.map(toProposal);
  }

  async findOpenByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>> {
    const rows = await this.db
      .select()
      .from(proposals)
      .where(and(eq(proposals.organismId, organismId), eq(proposals.status, 'open')));
    return rows.map(toProposal);
  }
}

function toProposal(row: typeof proposals.$inferSelect): Proposal {
  return {
    id: row.id as ProposalId,
    organismId: row.organismId as OrganismId,
    proposedContentTypeId: row.proposedContentTypeId as ContentTypeId,
    proposedPayload: row.proposedPayload,
    description: row.description ?? undefined,
    proposedBy: row.proposedBy as UserId,
    status: row.status as Proposal['status'],
    createdAt: row.createdAt.getTime() as Timestamp,
    resolvedAt: row.resolvedAt?.getTime() as Timestamp | undefined,
    resolvedBy: row.resolvedBy as UserId | undefined,
    declineReason: row.declineReason ?? undefined,
  };
}
