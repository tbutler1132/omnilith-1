import type { EventType } from '../events/event.js';
import type { EventRepository } from '../events/event-repository.js';
import type { OrganismId, Timestamp, UserId } from '../identity.js';
import type { Proposal } from '../proposals/proposal.js';
import type {
  OrganismContributions,
  OrganismContributor,
  OrganismWithState,
  QueryFilters,
  QueryPort,
  VitalityData,
} from '../query/query-port.js';
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
    private readonly events: EventRepository,
    _relationships?: InMemoryRelationshipRepository,
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

  async getOrganismContributions(organismId: OrganismId): Promise<OrganismContributions> {
    const contributionsByUser = new Map<UserId, OrganismContributor>();

    const ensureContributor = (userId: UserId): OrganismContributor => {
      const existing = contributionsByUser.get(userId);
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
      contributionsByUser.set(userId, created);
      return created;
    };

    const mergeLastContributedAt = (contributor: OrganismContributor, timestamp: number): OrganismContributor => {
      if (!Number.isFinite(timestamp)) return contributor;
      const nextLastAt =
        contributor.lastContributedAt === undefined ? timestamp : Math.max(contributor.lastContributedAt, timestamp);
      return {
        ...contributor,
        lastContributedAt: nextLastAt as Timestamp,
      };
    };

    const history = await this.states.findHistoryByOrganismId(organismId);
    for (const state of history) {
      const contributor = ensureContributor(state.createdBy);
      contributionsByUser.set(
        state.createdBy,
        mergeLastContributedAt(
          {
            ...contributor,
            stateCount: contributor.stateCount + 1,
          },
          state.createdAt,
        ),
      );
    }

    const organismProposals = await this.proposals.findByOrganismId(organismId);
    for (const proposal of organismProposals) {
      const proposer = ensureContributor(proposal.proposedBy);
      contributionsByUser.set(
        proposal.proposedBy,
        mergeLastContributedAt(
          {
            ...proposer,
            proposalCount: proposer.proposalCount + 1,
          },
          proposal.createdAt,
        ),
      );

      if (proposal.resolvedBy) {
        const resolver = ensureContributor(proposal.resolvedBy);
        const nextResolver: OrganismContributor = {
          ...resolver,
          integrationCount:
            proposal.status === 'integrated' ? resolver.integrationCount + 1 : resolver.integrationCount,
          declineCount: proposal.status === 'declined' ? resolver.declineCount + 1 : resolver.declineCount,
        };
        contributionsByUser.set(
          proposal.resolvedBy,
          mergeLastContributedAt(nextResolver, proposal.resolvedAt ?? proposal.createdAt),
        );
      }
    }

    const events = await this.events.findByOrganismId(organismId);
    for (const event of events) {
      const contributor = ensureContributor(event.actorId);
      const existingEventTypeCount = contributor.eventTypeCounts[event.type] ?? 0;
      const eventTypeCounts = {
        ...contributor.eventTypeCounts,
        [event.type]: existingEventTypeCount + 1,
      } as Readonly<Partial<Record<EventType, number>>>;

      contributionsByUser.set(
        event.actorId,
        mergeLastContributedAt(
          {
            ...contributor,
            eventCount: contributor.eventCount + 1,
            eventTypeCounts,
          },
          event.occurredAt,
        ),
      );
    }

    const contributors = [...contributionsByUser.values()].sort((a, b) => {
      const totalA = a.stateCount + a.proposalCount + a.integrationCount + a.declineCount + a.eventCount;
      const totalB = b.stateCount + b.proposalCount + b.integrationCount + b.declineCount + b.eventCount;
      if (totalA !== totalB) return totalB - totalA;
      const lastA = a.lastContributedAt ?? 0;
      const lastB = b.lastContributedAt ?? 0;
      if (lastA !== lastB) return lastB - lastA;
      return a.userId.localeCompare(b.userId);
    });

    return { organismId, contributors };
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
    // Collect all proposals authored by this user.
    const allOrganisms = this.organisms.getAll();
    const results: Proposal[] = [];

    for (const organism of allOrganisms) {
      const proposals = await this.proposals.findByOrganismId(organism.id);
      for (const p of proposals) {
        if (p.proposedBy === userId) {
          results.push(p);
        }
      }
    }

    return results;
  }
}
