import type { ProposalId, OrganismId } from '../identity.js';
import type { Proposal } from '../proposals/proposal.js';
import type { ProposalRepository } from '../proposals/proposal-repository.js';

export class InMemoryProposalRepository implements ProposalRepository {
  private proposals = new Map<ProposalId, Proposal>();

  async save(proposal: Proposal): Promise<void> {
    this.proposals.set(proposal.id, proposal);
  }

  async update(proposal: Proposal): Promise<void> {
    this.proposals.set(proposal.id, proposal);
  }

  async findById(id: ProposalId): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async findByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>> {
    return [...this.proposals.values()].filter((p) => p.organismId === organismId);
  }

  async findOpenByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>> {
    return [...this.proposals.values()].filter(
      (p) => p.organismId === organismId && p.status === 'open',
    );
  }
}
