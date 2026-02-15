import { beforeEach, describe, expect, it } from 'vitest';
import { composeOrganism } from '../composition/compose-organism.js';
import type { RelationshipId } from '../identity.js';
import { createOrganism } from '../organism/create-organism.js';
import { InMemoryCompositionRepository } from '../testing/in-memory-composition-repository.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryRelationshipRepository } from '../testing/in-memory-relationship-repository.js';
import { InMemoryStateRepository } from '../testing/in-memory-state-repository.js';
import { InMemoryVisibilityRepository } from '../testing/in-memory-visibility-repository.js';
import {
  createPassthroughContentType,
  createTestIdentityGenerator,
  resetIdCounter,
  testContentTypeId,
  testTimestamp,
  testUserId,
} from '../testing/test-helpers.js';
import { checkAccess } from '../visibility/access-control.js';

describe('visibility and access control', () => {
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

  it('a public organism is visible to anyone', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const stranger = testUserId('stranger');
    const decision = await checkAccess(stranger, organism.id, 'view', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('a private organism is not visible to users without a relationship', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    await visibilityRepository.save({
      organismId: organism.id,
      level: 'private',
      updatedAt: testTimestamp(),
    });

    const stranger = testUserId('stranger');
    const decision = await checkAccess(stranger, organism.id, 'view', accessDeps());
    expect(decision.allowed).toBe(false);
  });

  it('a private organism is visible to users with a relationship', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    await visibilityRepository.save({
      organismId: organism.id,
      level: 'private',
      updatedAt: testTimestamp(),
    });

    // Steward has a relationship (created during createOrganism)
    const decision = await checkAccess(steward, organism.id, 'view', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('a members-only organism is visible to community members', async () => {
    const founder = testUserId('founder');
    const { organism: community } = await createOrganism(
      { name: 'Community', contentTypeId: testContentTypeId(), payload: { name: 'Community' }, createdBy: founder },
      createDeps(),
    );

    const { organism: child } = await createOrganism(
      { name: 'Child', contentTypeId: testContentTypeId(), payload: { name: 'Child' }, createdBy: founder },
      createDeps(),
    );

    await composeOrganism(
      { parentId: community.id, childId: child.id, composedBy: founder },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    await visibilityRepository.save({
      organismId: child.id,
      level: 'members',
      updatedAt: testTimestamp(),
    });

    // Add membership
    const member = testUserId('member');
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: member,
      organismId: community.id,
      role: 'member',
      createdAt: testTimestamp(),
    });

    const decision = await checkAccess(member, child.id, 'view', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('a member of a community does not automatically have integration authority over organisms inside it', async () => {
    const founder = testUserId('founder');
    const { organism: community } = await createOrganism(
      { name: 'Community', contentTypeId: testContentTypeId(), payload: { name: 'Community' }, createdBy: founder },
      createDeps(),
    );

    // Create a child organism with a different steward
    const childSteward = testUserId('child-steward');
    const { organism: child } = await createOrganism(
      { name: 'Child', contentTypeId: testContentTypeId(), payload: { name: 'Child' }, createdBy: childSteward },
      createDeps(),
    );

    await composeOrganism(
      { parentId: community.id, childId: child.id, composedBy: founder },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    // Add a regular member to the community
    const member = testUserId('member');
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: member,
      organismId: community.id,
      role: 'member',
      createdAt: testTimestamp(),
    });

    // Member should NOT have integration authority on the child
    const decision = await checkAccess(member, child.id, 'integrate-proposal', accessDeps());
    expect(decision.allowed).toBe(false);
  });

  it('the steward of an organism can integrate proposals', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const decision = await checkAccess(steward, organism.id, 'integrate-proposal', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('a user with explicit integration authority can integrate proposals', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
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

  it('any user who can view an organism can open a proposal', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const stranger = testUserId('stranger');
    const decision = await checkAccess(stranger, organism.id, 'open-proposal', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('the steward can change visibility', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const decision = await checkAccess(steward, organism.id, 'change-visibility', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('the founder of a parent community has integration authority over organisms composed inside it', async () => {
    const founder = testUserId('founder');
    const { organism: community } = await createOrganism(
      { name: 'Community', contentTypeId: testContentTypeId(), payload: { name: 'Community' }, createdBy: founder },
      createDeps(),
    );

    const childSteward = testUserId('child-steward');
    const { organism: child } = await createOrganism(
      { name: 'Child', contentTypeId: testContentTypeId(), payload: { name: 'Child' }, createdBy: childSteward },
      createDeps(),
    );

    await composeOrganism(
      { parentId: community.id, childId: child.id, composedBy: founder },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    // Add founder membership on the community
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: founder,
      organismId: community.id,
      role: 'founder',
      createdAt: testTimestamp(),
    });

    const decision = await checkAccess(founder, child.id, 'integrate-proposal', accessDeps());
    expect(decision.allowed).toBe(true);
  });

  it('the founder of a parent community can compose and decompose organisms within it', async () => {
    const founder = testUserId('founder');
    const { organism: community } = await createOrganism(
      { name: 'Community', contentTypeId: testContentTypeId(), payload: { name: 'Community' }, createdBy: founder },
      createDeps(),
    );

    const childSteward = testUserId('child-steward');
    const { organism: child } = await createOrganism(
      { name: 'Child', contentTypeId: testContentTypeId(), payload: { name: 'Child' }, createdBy: childSteward },
      createDeps(),
    );

    await composeOrganism(
      { parentId: community.id, childId: child.id, composedBy: founder },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: founder,
      organismId: community.id,
      role: 'founder',
      createdAt: testTimestamp(),
    });

    const composeDecision = await checkAccess(founder, child.id, 'compose', accessDeps());
    expect(composeDecision.allowed).toBe(true);

    const decomposeDecision = await checkAccess(founder, child.id, 'decompose', accessDeps());
    expect(decomposeDecision.allowed).toBe(true);
  });

  it('a regular member of a parent community cannot compose or decompose organisms within it', async () => {
    const founder = testUserId('founder');
    const { organism: community } = await createOrganism(
      { name: 'Community', contentTypeId: testContentTypeId(), payload: { name: 'Community' }, createdBy: founder },
      createDeps(),
    );

    const childSteward = testUserId('child-steward');
    const { organism: child } = await createOrganism(
      { name: 'Child', contentTypeId: testContentTypeId(), payload: { name: 'Child' }, createdBy: childSteward },
      createDeps(),
    );

    await composeOrganism(
      { parentId: community.id, childId: child.id, composedBy: founder },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    const member = testUserId('member');
    await relationshipRepository.save({
      id: identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: member,
      organismId: community.id,
      role: 'member',
      createdAt: testTimestamp(),
    });

    const composeDecision = await checkAccess(member, child.id, 'compose', accessDeps());
    expect(composeDecision.allowed).toBe(false);

    const decomposeDecision = await checkAccess(member, child.id, 'decompose', accessDeps());
    expect(decomposeDecision.allowed).toBe(false);
  });

  it('a non-steward cannot change visibility', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { name: 'Test', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    const stranger = testUserId('stranger');
    const decision = await checkAccess(stranger, organism.id, 'change-visibility', accessDeps());
    expect(decision.allowed).toBe(false);
  });
});
