import { describe, it, expect, beforeEach } from 'vitest';
import { createOrganism } from '../organism/create-organism.js';
import { checkAccess } from '../visibility/access-control.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryStateRepository } from '../testing/in-memory-state-repository.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryRelationshipRepository } from '../testing/in-memory-relationship-repository.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryCompositionRepository } from '../testing/in-memory-composition-repository.js';
import { InMemoryVisibilityRepository } from '../testing/in-memory-visibility-repository.js';
import {
  createTestIdentityGenerator,
  createPassthroughContentType,
  testUserId,
  testContentTypeId,
  testTimestamp,
  resetIdCounter,
} from '../testing/test-helpers.js';
import type { RelationshipId } from '../identity.js';

describe('relationships', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let compositionRepository: InMemoryCompositionRepository;
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

  const accessDeps = () => ({
    visibilityRepository,
    relationshipRepository,
    compositionRepository,
    organismRepository,
  });

  it('stewardship is established at the threshold', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const rels = await relationshipRepository.findByUserAndOrganism(steward, organism.id);
    expect(rels).toHaveLength(1);
    expect(rels[0].type).toBe('stewardship');
  });

  it('stewardship grants compose and decompose authority', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const composeDecision = await checkAccess(steward, organism.id, 'compose', accessDeps());
    expect(composeDecision.allowed).toBe(true);

    const decomposeDecision = await checkAccess(steward, organism.id, 'decompose', accessDeps());
    expect(decomposeDecision.allowed).toBe(true);
  });

  it('membership does not grant integration authority', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const member = testUserId('member');
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: member,
      organismId: organism.id,
      role: 'member',
      createdAt: testTimestamp(),
    });

    const decision = await checkAccess(member, organism.id, 'integrate-proposal', accessDeps());
    expect(decision.allowed).toBe(false);
  });

  it('integration-authority grants the ability to integrate proposals', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const integrator = testUserId('integrator');
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'integration-authority',
      userId: integrator,
      organismId: organism.id,
      createdAt: testTimestamp(),
    });

    const decision = await checkAccess(integrator, organism.id, 'integrate-proposal', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('each relationship type is handled with distinct logic', async () => {
    const user = testUserId('user');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: testUserId('other') },
      createDeps(),
    );

    // Membership alone: can view, cannot integrate
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: user,
      organismId: organism.id,
      role: 'member',
      createdAt: testTimestamp(),
    });

    const integrateDecision = await checkAccess(user, organism.id, 'integrate-proposal', accessDeps());
    expect(integrateDecision.allowed).toBe(false);

    const composeDecision = await checkAccess(user, organism.id, 'compose', accessDeps());
    expect(composeDecision.allowed).toBe(false);

    const viewDecision = await checkAccess(user, organism.id, 'view', accessDeps());
    expect(viewDecision.allowed).toBe(true);
  });

  it('relationships can be queried by user', async () => {
    const user = testUserId('user');
    const { organism: org1 } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: user },
      createDeps(),
    );
    const { organism: org2 } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: {}, createdBy: user },
      createDeps(),
    );

    const rels = await relationshipRepository.findByUser(user, 'stewardship');
    expect(rels).toHaveLength(2);
  });
});
