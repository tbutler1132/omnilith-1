import type { OrganismId, UserId } from '../identity.js';
import type { Proposal } from '../proposals/proposal.js';
import type { OrganismWithState, QueryFilters, QueryPort, VitalityData } from '../query/query-port.js';
import type { InMemoryCompositionRepository } from './in-memory-composition-repository.js';
import type { InMemoryOrganismRepository } from './in-memory-organism-repository.js';
import type { InMemoryProposalRepository } from './in-memory-proposal-repository.js';
import type { InMemoryRelationshipRepository } from './in-memory-relationship-repository.js';
import type { InMemoryStateRepository } from './in-memory-state-repository.js';

export class InMemoryQueryPort implements QueryPort {
  constructor(
    private readonly organisms: InMemoryOrganismRepository,
    private readonly states: InMemoryStateRepository,
    private readonly proposals: InMemoryProposalRepository,
    private readonly composition: InMemoryCompositionRepository,
    private readonly relationships?: InMemoryRelationshipRepository,
  ) {}

  async findOrganismsWithState(filters: QueryFilters): Promise<ReadonlyArray<OrganismWithState>> {
    let all = this.organisms.getAll();

    if (filters.createdBy) {
      all = all.filter((o) => o.createdBy === filters.createdBy);
    }

    if (filters.parentId) {
      const children = await this.composition.findChildren(filters.parentId);
      const childIds = new Set(children.map((c) => c.childId));
      all = all.filter((o) => childIds.has(o.id));
    }

    if (filters.nameQuery) {
      const normalizedQuery = filters.nameQuery.trim().toLowerCase();
      if (normalizedQuery.length > 0) {
        all = all.filter((o) => o.name.toLowerCase().includes(normalizedQuery));
      }
    }

    const results: OrganismWithState[] = [];
    for (const organism of all) {
      const currentState = await this.states.findCurrentByOrganismId(organism.id);

      if (filters.contentTypeId && currentState?.contentTypeId !== filters.contentTypeId) {
        continue;
      }

      results.push({ organism, currentState });
    }

    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? results.length;
    return results.slice(offset, offset + limit);
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
    const all = this.organisms.getAll().filter((o) => o.createdBy === userId);
    const results: OrganismWithState[] = [];
    for (const organism of all) {
      const currentState = await this.states.findCurrentByOrganismId(organism.id);
      results.push({ organism, currentState });
    }
    return results;
  }

  async findProposalsByUser(userId: UserId): Promise<ReadonlyArray<Proposal>> {
    // Collect all proposals authored by this user
    const allOrganisms = this.organisms.getAll();
    const seen = new Set<string>();
    const results: Proposal[] = [];

    for (const organism of allOrganisms) {
      const proposals = await this.proposals.findByOrganismId(organism.id);
      for (const p of proposals) {
        if (p.proposedBy === userId && !seen.has(p.id)) {
          seen.add(p.id);
          results.push(p);
        }
      }
    }

    // Also include proposals on organisms where user has integration authority
    if (this.relationships) {
      const integrationRels = await this.relationships.findByUser(userId, 'integration-authority');
      for (const rel of integrationRels) {
        const proposals = await this.proposals.findByOrganismId(rel.organismId);
        for (const p of proposals) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            results.push(p);
          }
        }
      }
    }

    return results;
  }
}
