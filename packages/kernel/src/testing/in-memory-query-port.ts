import type { OrganismId, UserId, Timestamp } from '../identity.js';
import type { QueryPort, OrganismWithState, VitalityData, QueryFilters } from '../query/query-port.js';
import type { InMemoryOrganismRepository } from './in-memory-organism-repository.js';
import type { InMemoryStateRepository } from './in-memory-state-repository.js';
import type { InMemoryProposalRepository } from './in-memory-proposal-repository.js';
import type { InMemoryCompositionRepository } from './in-memory-composition-repository.js';

export class InMemoryQueryPort implements QueryPort {
  constructor(
    private readonly organisms: InMemoryOrganismRepository,
    private readonly states: InMemoryStateRepository,
    private readonly proposals: InMemoryProposalRepository,
    private readonly composition: InMemoryCompositionRepository,
  ) {}

  async findOrganismsWithState(filters: QueryFilters): Promise<ReadonlyArray<OrganismWithState>> {
    // Simple implementation — real adapter would use SQL
    const results: OrganismWithState[] = [];
    // This is intentionally naive for testing
    return results;
  }

  async getVitality(organismId: OrganismId): Promise<VitalityData> {
    const history = await this.states.findHistoryByOrganismId(organismId);
    const openProposals = await this.proposals.findOpenByOrganismId(organismId);
    const lastState = history.length > 0 ? history[history.length - 1] : undefined;

    return {
      organismId,
      recentStateChanges: history.length,
      openProposalCount: openProposals.length,
      lastActivityAt: lastState?.createdAt,
    };
  }

  async findOrganismsByUser(userId: UserId): Promise<ReadonlyArray<OrganismWithState>> {
    // Naive — real adapter would join tables
    return [];
  }
}
