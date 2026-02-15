import { beforeEach, describe, expect, it } from 'vitest';
import { AccessDeniedError, OrganismNotFoundError } from '../errors.js';
import type { OrganismId } from '../identity.js';
import { appendState } from '../organism/append-state.js';
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
  testUserId,
} from '../testing/test-helpers.js';

describe('appendState', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let compositionRepository: InMemoryCompositionRepository;
  let visibilityRepository: InMemoryVisibilityRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let identityGenerator: ReturnType<typeof createTestIdentityGenerator>;

  beforeEach(() => {
    resetIdCounter();
    organismRepository = new InMemoryOrganismRepository();
    stateRepository = new InMemoryStateRepository();
    eventPublisher = new InMemoryEventPublisher();
    relationshipRepository = new InMemoryRelationshipRepository();
    compositionRepository = new InMemoryCompositionRepository();
    visibilityRepository = new InMemoryVisibilityRepository();
    contentTypeRegistry = new InMemoryContentTypeRegistry();
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

  const appendDeps = () => ({
    organismRepository,
    stateRepository,
    contentTypeRegistry,
    eventPublisher,
    identityGenerator,
    visibilityRepository,
    relationshipRepository,
    compositionRepository,
  });

  it('open-trunk organisms accept direct state changes without proposals', async () => {
    const userId = testUserId('user');
    const { organism } = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { v: 1 },
        createdBy: userId,
        openTrunk: true,
      },
      createDeps(),
    );

    const newState = await appendState(
      {
        organismId: organism.id,
        contentTypeId: testContentTypeId(),
        payload: { v: 2 },
        appendedBy: userId,
      },
      appendDeps(),
    );

    expect(newState.sequenceNumber).toBe(2);
    expect(newState.payload).toEqual({ v: 2 });
  });

  it('non-open-trunk organisms deny direct state changes', async () => {
    const userId = testUserId('user');
    const { organism } = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { v: 1 },
        createdBy: userId,
        openTrunk: false,
      },
      createDeps(),
    );

    await expect(
      appendState(
        {
          organismId: organism.id,
          contentTypeId: testContentTypeId(),
          payload: { v: 2 },
          appendedBy: userId,
        },
        appendDeps(),
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('state sequence numbers increment correctly', async () => {
    const userId = testUserId('user');
    const { organism } = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { v: 1 },
        createdBy: userId,
        openTrunk: true,
      },
      createDeps(),
    );

    const state2 = await appendState(
      {
        organismId: organism.id,
        contentTypeId: testContentTypeId(),
        payload: { v: 2 },
        appendedBy: userId,
      },
      appendDeps(),
    );

    const state3 = await appendState(
      {
        organismId: organism.id,
        contentTypeId: testContentTypeId(),
        payload: { v: 3 },
        appendedBy: userId,
      },
      appendDeps(),
    );

    expect(state2.sequenceNumber).toBe(2);
    expect(state3.sequenceNumber).toBe(3);
  });

  it('parentStateId points to the previous state in linear history', async () => {
    const userId = testUserId('user');
    const { organism, initialState } = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { v: 1 },
        createdBy: userId,
        openTrunk: true,
      },
      createDeps(),
    );

    const state2 = await appendState(
      {
        organismId: organism.id,
        contentTypeId: testContentTypeId(),
        payload: { v: 2 },
        appendedBy: userId,
      },
      appendDeps(),
    );

    expect(state2.parentStateId).toBe(initialState.id);
  });

  it('appending state emits a state.appended event', async () => {
    const userId = testUserId('user');
    const { organism } = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { v: 1 },
        createdBy: userId,
        openTrunk: true,
      },
      createDeps(),
    );

    eventPublisher.clear();

    await appendState(
      {
        organismId: organism.id,
        contentTypeId: testContentTypeId(),
        payload: { v: 2 },
        appendedBy: userId,
      },
      appendDeps(),
    );

    const events = eventPublisher.findByType('state.appended');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(organism.id);
  });

  it('a private open-trunk organism denies state changes from unrelated users', async () => {
    const steward = testUserId('steward');
    const outsider = testUserId('outsider');
    const { organism } = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { v: 1 },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps(),
    );

    // Mark the organism as private
    await visibilityRepository.save({
      organismId: organism.id,
      level: 'private',
      updatedAt: identityGenerator.timestamp(),
    });

    await expect(
      appendState(
        {
          organismId: organism.id,
          contentTypeId: testContentTypeId(),
          payload: { v: 2 },
          appendedBy: outsider,
        },
        appendDeps(),
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('appending to a nonexistent organism fails', async () => {
    await expect(
      appendState(
        {
          organismId: 'nonexistent' as OrganismId,
          contentTypeId: testContentTypeId(),
          payload: {},
          appendedBy: testUserId(),
        },
        appendDeps(),
      ),
    ).rejects.toThrow(OrganismNotFoundError);
  });
});
