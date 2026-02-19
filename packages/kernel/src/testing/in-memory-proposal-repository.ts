/**
 * InMemoryProposalRepository — test adapter for proposal state.
 *
 * Enables proposal workflow tests, including resolution transitions,
 * without relying on persistent storage.
 */

import type { OrganismId, ProposalId } from '../identity.js';
import type { Proposal } from '../proposals/proposal.js';
import type { ProposalRepository } from '../proposals/proposal-repository.js';

export class InMemoryProposalRepository implements ProposalRepository {
  private proposals = new Map<ProposalId, Proposal>();

  async save(proposal: Proposal): Promise<void> {
    this.proposals.set(proposal.id, proposal);
  }

  async update(proposal: Proposal): Promise<boolean> {
    const current = this.proposals.get(proposal.id);
    if (!current) return false;

    // Enforce compare-and-swap semantics for resolution transitions.
    if (proposal.status !== 'open' && current.status !== 'open') {
      return false;
    }

    this.proposals.set(proposal.id, proposal);
    return true;
  }

  async findById(id: ProposalId): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async findByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>> {
    return [...this.proposals.values()].filter((p) => p.organismId === organismId);
  }

  async findOpenByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>> {
    return [...this.proposals.values()].filter((p) => p.organismId === organismId && p.status === 'open');
  }
}
