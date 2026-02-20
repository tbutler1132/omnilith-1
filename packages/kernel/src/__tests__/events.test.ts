import { beforeEach, describe, expect, it } from 'vitest';
import { composeOrganism } from '../composition/compose-organism.js';
import { decomposeOrganism } from '../composition/decompose-organism.js';
import { appendState } from '../organism/append-state.js';
import { createOrganism } from '../organism/create-organism.js';
import { declineProposal } from '../proposals/decline-proposal.js';
import { integrateProposal } from '../proposals/integrate-proposal.js';
import { openProposal } from '../proposals/open-proposal.js';
import { InMemoryCompositionRepository } from '../testing/in-memory-composition-repository.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryProposalRepository } from '../testing/in-memory-proposal-repository.js';
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
import { changeVisibility } from '../visibility/change-visibility.js';

describe('events', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let compositionRepository: InMemoryCompositionRepository;
  let proposalRepository: InMemoryProposalRepository;
  let visibilityRepository: InMemoryVisibilityRepository;
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
  });

  const createDeps = () => ({
    organismRepository,
    stateRepository,
    eventPublisher,
    relationshipRepository,
    contentTypeRegistry,
    identityGenerator,
  });

  it('creating an organism emits organism.created with correct data', async () => {
    const userId = testUserId('creator');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: userId },
      createDeps(),
    );

    const events = eventPublisher.findByType('organism.created');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(organism.id);
    expect(events[0].actorId).toBe(userId);
    expect(events[0].payload.contentTypeId).toBe(testContentTypeId());
  });

  it('appending state emits state.appended with correct data', async () => {
    const userId = testUserId('user');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: userId, openTrunk: true },
      createDeps(),
    );

    eventPublisher.clear();

    const newState = await appendState(
      {
        organismId: organism.id,
        contentTypeId: testContentTypeId(),
        payload: { v: 2 },
        appendedBy: userId,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        identityGenerator,
        visibilityRepository,
        relationshipRepository,
        compositionRepository,
      },
    );

    const events = eventPublisher.findByType('state.appended');
    expect(events).toHaveLength(1);
    expect(events[0].payload.stateId).toBe(newState.id);
    expect(events[0].payload.sequenceNumber).toBe(2);
  });

  it('composing emits organism.composed with parent and child data', async () => {
    const userId = testUserId('user');
    const { organism: parent } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );
    const { organism: child } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );

    eventPublisher.clear();

    await composeOrganism(
      { parentId: parent.id, childId: child.id, composedBy: userId },
      {
        organismRepository,
        compositionRepository,
        visibilityRepository,
        relationshipRepository,
        eventPublisher,
        identityGenerator,
      },
    );

    const events = eventPublisher.findByType('organism.composed');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(parent.id);
    expect(events[0].payload.childId).toBe(child.id);
  });

  it('decomposing emits organism.decomposed', async () => {
    const userId = testUserId('user');
    const { organism: parent } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );
    const { organism: child } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );

    await composeOrganism(
      { parentId: parent.id, childId: child.id, composedBy: userId },
      {
        organismRepository,
        compositionRepository,
        visibilityRepository,
        relationshipRepository,
        eventPublisher,
        identityGenerator,
      },
    );

    eventPublisher.clear();

    await decomposeOrganism(
      { parentId: parent.id, childId: child.id, decomposedBy: userId },
      {
        organismRepository,
        compositionRepository,
        visibilityRepository,
        relationshipRepository,
        eventPublisher,
        identityGenerator,
      },
    );

    const events = eventPublisher.findByType('organism.decomposed');
    expect(events).toHaveLength(1);
    expect(events[0].payload.childId).toBe(child.id);
  });

  it('opening a proposal emits proposal.opened', async () => {
    const userId = testUserId('user');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );

    eventPublisher.clear();

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: userId,
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

    const events = eventPublisher.findByType('proposal.opened');
    expect(events).toHaveLength(1);
    expect(events[0].payload.proposalId).toBe(proposal.id);
  });

  it('integrating a proposal emits proposal.integrated', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
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

    eventPublisher.clear();

    await integrateProposal(
      { proposalId: proposal.id, integratedBy: steward },
      {
        proposalRepository,
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        compositionRepository,
        eventPublisher,
        relationshipRepository,
        visibilityRepository,
        identityGenerator,
      },
    );

    const events = eventPublisher.findByType('proposal.integrated');
    expect(events).toHaveLength(1);
    expect(events[0].payload.proposalId).toBe(proposal.id);
  });

  it('declining a proposal emits proposal.declined', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
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

    eventPublisher.clear();

    await declineProposal(
      { proposalId: proposal.id, declinedBy: steward, reason: 'No thanks' },
      {
        proposalRepository,
        organismRepository,
        compositionRepository,
        eventPublisher,
        relationshipRepository,
        visibilityRepository,
        identityGenerator,
      },
    );

    const events = eventPublisher.findByType('proposal.declined');
    expect(events).toHaveLength(1);
    expect(events[0].payload.reason).toBe('No thanks');
  });

  it('changing visibility emits visibility.changed', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    eventPublisher.clear();

    await changeVisibility(
      {
        organismId: organism.id,
        level: 'members',
        changedBy: steward,
      },
      {
        organismRepository,
        visibilityRepository,
        relationshipRepository,
        compositionRepository,
        eventPublisher,
        identityGenerator,
      },
    );

    const events = eventPublisher.findByType('visibility.changed');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(organism.id);
    expect(events[0].payload.level).toBe('members');
  });

  it('every event has a unique id and timestamp', async () => {
    const userId = testUserId('user');
    await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );
    await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: userId },
      createDeps(),
    );

    const ids = eventPublisher.published.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
