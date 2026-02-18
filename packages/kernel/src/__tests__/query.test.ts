import { beforeEach, describe, expect, it } from 'vitest';
import { composeOrganism } from '../composition/compose-organism.js';
import { createOrganism } from '../organism/create-organism.js';
import { openProposal } from '../proposals/open-proposal.js';
import { InMemoryCompositionRepository } from '../testing/in-memory-composition-repository.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryProposalRepository } from '../testing/in-memory-proposal-repository.js';
import { InMemoryQueryPort } from '../testing/in-memory-query-port.js';
import { InMemoryRelationshipRepository } from '../testing/in-memory-relationship-repository.js';
import { InMemoryStateRepository } from '../testing/in-memory-state-repository.js';
import { InMemoryVisibilityRepository } from '../testing/in-memory-visibility-repository.js';
import {
  createPassthroughContentType,
  createTestIdentityGenerator,
  resetIdCounter,
  testContentTypeId,
  testUserId,
} from '../testing/test-helpers.js';

describe('query port', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let compositionRepository: InMemoryCompositionRepository;
  let proposalRepository: InMemoryProposalRepository;
  let visibilityRepository: InMemoryVisibilityRepository;
  let queryPort: InMemoryQueryPort;
  let identityGenerator: ReturnType<typeof createTestIdentityGenerator>;

  beforeEach(() => {
    resetIdCounter();
    organismRepository = new InMemoryOrganismRepository();
    stateRepository = new InMemoryStateRepository();
    eventPublisher = new InMemoryEventPublisher();
    relationshipRepository = new InMemoryRelationshipRepository();
    contentTypeRegistry = new InMemoryContentTypeRegistry();
    compositionRepository = new InMemoryCompositionRepository();
    proposalRepository = new InMemoryProposalRepository();
    visibilityRepository = new InMemoryVisibilityRepository();
    identityGenerator = createTestIdentityGenerator();
    contentTypeRegistry.register(createPassthroughContentType());
    contentTypeRegistry.register(createPassthroughContentType('other-type'));
    queryPort = new InMemoryQueryPort(
      organismRepository,
      stateRepository,
      proposalRepository,
      compositionRepository,
      eventPublisher,
      relationshipRepository,
    );
  });

  const createDeps = () => ({
    organismRepository,
    stateRepository,
    eventPublisher,
    relationshipRepository,
    contentTypeRegistry,
    identityGenerator,
  });

  const composeDeps = () => ({
    organismRepository,
    compositionRepository,
    eventPublisher,
    identityGenerator,
  });

  async function makeOrganism(name: string, options?: { contentTypeId?: string; userId?: string }) {
    const userId = testUserId(options?.userId ?? 'user');
    return createOrganism(
      {
        name,
        contentTypeId: testContentTypeId(options?.contentTypeId),
        payload: { name },
        createdBy: userId,
      },
      createDeps(),
    );
  }

  describe('findOrganismsWithState', () => {
    it('returns all organisms when no filters are provided', async () => {
      await makeOrganism('First');
      await makeOrganism('Second');

      const results = await queryPort.findOrganismsWithState({});
      expect(results).toHaveLength(2);
      expect(results[0].currentState).toBeDefined();
      expect(results[1].currentState).toBeDefined();
    });

    it('filters by content type', async () => {
      await makeOrganism('Text', { contentTypeId: 'test-type' });
      await makeOrganism('Other', { contentTypeId: 'other-type' });

      const results = await queryPort.findOrganismsWithState({ contentTypeId: testContentTypeId('other-type') });
      expect(results).toHaveLength(1);
      expect(results[0].currentState!.contentTypeId).toBe('other-type');
    });

    it('filters by creator', async () => {
      await makeOrganism('By Alice', { userId: 'alice' });
      await makeOrganism('By Bob', { userId: 'bob' });

      const results = await queryPort.findOrganismsWithState({ createdBy: testUserId('alice') });
      expect(results).toHaveLength(1);
      expect(results[0].organism.createdBy).toBe(testUserId('alice'));
    });

    it('filters by parent organism', async () => {
      const { organism: parent } = await makeOrganism('Parent');
      const { organism: child } = await makeOrganism('Child');
      await makeOrganism('Orphan');

      await composeOrganism({ parentId: parent.id, childId: child.id, composedBy: testUserId('user') }, composeDeps());

      const results = await queryPort.findOrganismsWithState({ parentId: parent.id });
      expect(results).toHaveLength(1);
      expect(results[0].organism.id).toBe(child.id);
    });

    it('filters by name query case-insensitively', async () => {
      await makeOrganism('Alpha Song');
      await makeOrganism('Beta Draft');
      await makeOrganism('alpha Notes');

      const results = await queryPort.findOrganismsWithState({ nameQuery: 'ALPHA' });
      expect(results).toHaveLength(2);
      expect(results.map((result) => result.organism.name)).toEqual(['Alpha Song', 'alpha Notes']);
    });

    it('paginates with limit and offset', async () => {
      await makeOrganism('First');
      await makeOrganism('Second');
      await makeOrganism('Third');

      const page1 = await queryPort.findOrganismsWithState({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await queryPort.findOrganismsWithState({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(1);
    });

    it('returns empty when no organisms match', async () => {
      const results = await queryPort.findOrganismsWithState({ createdBy: testUserId('nobody') });
      expect(results).toHaveLength(0);
    });
  });

  describe('getVitality', () => {
    it('returns state change count and open proposal count', async () => {
      const { organism } = await makeOrganism('Song');

      await openProposal(
        {
          organismId: organism.id,
          proposedContentTypeId: testContentTypeId(),
          proposedPayload: { name: 'v2' },
          proposedBy: testUserId('proposer'),
        },
        {
          organismRepository,
          stateRepository,
          proposalRepository,
          contentTypeRegistry,
          eventPublisher,
          identityGenerator,
          visibilityRepository,
          relationshipRepository,
          compositionRepository,
        },
      );

      const vitality = await queryPort.getVitality(organism.id);
      expect(vitality.organismId).toBe(organism.id);
      expect(vitality.recentStateChanges).toBe(1);
      expect(vitality.openProposalCount).toBe(1);
      expect(vitality.lastActivityAt).toBeDefined();
    });

    it('reports zero proposals for a fresh organism', async () => {
      const { organism } = await makeOrganism('Fresh');

      const vitality = await queryPort.getVitality(organism.id);
      expect(vitality.openProposalCount).toBe(0);
      expect(vitality.recentStateChanges).toBe(1); // initial state
    });
  });

  describe('findOrganismsByUser', () => {
    it('returns organisms created by the specified user', async () => {
      await makeOrganism('By Alice', { userId: 'alice' });
      await makeOrganism('Also Alice', { userId: 'alice' });
      await makeOrganism('By Bob', { userId: 'bob' });

      const results = await queryPort.findOrganismsByUser(testUserId('alice'));
      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.organism.createdBy).toBe(testUserId('alice'));
      }
    });

    it('returns empty for an unknown user', async () => {
      await makeOrganism('Something');

      const results = await queryPort.findOrganismsByUser(testUserId('ghost'));
      expect(results).toHaveLength(0);
    });
  });

  describe('findProposalsByUser', () => {
    it('returns proposals authored by the user', async () => {
      const { organism } = await makeOrganism('Song');
      const proposer = testUserId('alice');

      await openProposal(
        {
          organismId: organism.id,
          proposedContentTypeId: testContentTypeId(),
          proposedPayload: { name: 'v2' },
          proposedBy: proposer,
        },
        {
          organismRepository,
          stateRepository,
          proposalRepository,
          contentTypeRegistry,
          eventPublisher,
          identityGenerator,
          visibilityRepository,
          relationshipRepository,
          compositionRepository,
        },
      );

      const results = await queryPort.findProposalsByUser(proposer);
      expect(results).toHaveLength(1);
      expect(results[0].proposedBy).toBe(proposer);
    });

    it('does not return proposals solely from integration authority', async () => {
      const { organism } = await makeOrganism('Song', { userId: 'owner' });
      const integrator = testUserId('integrator');
      const proposer = testUserId('someone');

      // Integration authority does not affect authored proposal lookup.
      await relationshipRepository.save({
        id: identityGenerator.relationshipId(),
        type: 'integration-authority',
        userId: integrator,
        organismId: organism.id,
        createdAt: identityGenerator.timestamp(),
      });

      await openProposal(
        {
          organismId: organism.id,
          proposedContentTypeId: testContentTypeId(),
          proposedPayload: { name: 'v2' },
          proposedBy: proposer,
        },
        {
          organismRepository,
          stateRepository,
          proposalRepository,
          contentTypeRegistry,
          eventPublisher,
          identityGenerator,
          visibilityRepository,
          relationshipRepository,
          compositionRepository,
        },
      );

      const results = await queryPort.findProposalsByUser(integrator);
      expect(results).toHaveLength(0);
    });

    it('does not return proposals on unrelated organisms', async () => {
      const { organism } = await makeOrganism('Song', { userId: 'owner' });
      const unrelated = testUserId('stranger');

      await openProposal(
        {
          organismId: organism.id,
          proposedContentTypeId: testContentTypeId(),
          proposedPayload: { name: 'v2' },
          proposedBy: testUserId('someone'),
        },
        {
          organismRepository,
          stateRepository,
          proposalRepository,
          contentTypeRegistry,
          eventPublisher,
          identityGenerator,
          visibilityRepository,
          relationshipRepository,
          compositionRepository,
        },
      );

      const results = await queryPort.findProposalsByUser(unrelated);
      expect(results).toHaveLength(0);
    });
  });

  describe('getOrganismContributions', () => {
    it('aggregates state, proposal, resolver, and event contributions by user', async () => {
      const owner = testUserId('owner');
      const proposer = testUserId('proposer');
      const integrator = testUserId('integrator');

      const { organism } = await createOrganism(
        {
          name: 'Shared Work',
          contentTypeId: testContentTypeId(),
          payload: { v: 1 },
          createdBy: owner,
        },
        createDeps(),
      );

      await openProposal(
        {
          organismId: organism.id,
          proposedContentTypeId: testContentTypeId(),
          proposedPayload: { v: 2 },
          proposedBy: proposer,
        },
        {
          organismRepository,
          stateRepository,
          proposalRepository,
          contentTypeRegistry,
          eventPublisher,
          identityGenerator,
          visibilityRepository,
          relationshipRepository,
          compositionRepository,
        },
      );

      const [open] = await proposalRepository.findByOrganismId(organism.id);
      expect(open).toBeDefined();
      if (!open) {
        throw new Error('Expected open proposal');
      }

      await proposalRepository.update({
        ...open,
        status: 'integrated',
        resolvedBy: integrator,
        resolvedAt: identityGenerator.timestamp(),
      });

      await eventPublisher.publish({
        id: identityGenerator.eventId(),
        type: 'proposal.integrated',
        organismId: organism.id,
        actorId: integrator,
        occurredAt: identityGenerator.timestamp(),
        payload: { proposalId: open.id },
      });

      const contributions = await queryPort.getOrganismContributions(organism.id);
      expect(contributions.organismId).toBe(organism.id);
      expect(contributions.contributors.length).toBeGreaterThanOrEqual(3);

      const byUser = new Map(contributions.contributors.map((entry) => [entry.userId, entry]));

      expect(byUser.get(owner)?.stateCount).toBe(1);
      expect(byUser.get(proposer)?.proposalCount).toBe(1);
      expect(byUser.get(integrator)?.integrationCount).toBe(1);
      expect(byUser.get(integrator)?.eventTypeCounts['proposal.integrated']).toBeGreaterThan(0);
    });
  });
});
