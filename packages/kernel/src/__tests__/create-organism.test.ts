import { beforeEach, describe, expect, it } from 'vitest';
import { ContentTypeNotRegisteredError, ValidationFailedError } from '../errors.js';
import { createOrganism } from '../organism/create-organism.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryRelationshipRepository } from '../testing/in-memory-relationship-repository.js';
import { InMemoryStateRepository } from '../testing/in-memory-state-repository.js';
import {
  createPassthroughContentType,
  createRejectingContentType,
  createTestIdentityGenerator,
  resetIdCounter,
  testContentTypeId,
  testUserId,
} from '../testing/test-helpers.js';

describe('createOrganism', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let identityGenerator: ReturnType<typeof createTestIdentityGenerator>;

  beforeEach(() => {
    resetIdCounter();
    organismRepository = new InMemoryOrganismRepository();
    stateRepository = new InMemoryStateRepository();
    eventPublisher = new InMemoryEventPublisher();
    relationshipRepository = new InMemoryRelationshipRepository();
    contentTypeRegistry = new InMemoryContentTypeRegistry();
    identityGenerator = createTestIdentityGenerator();
  });

  const deps = () => ({
    organismRepository,
    stateRepository,
    eventPublisher,
    relationshipRepository,
    contentTypeRegistry,
    identityGenerator,
  });

  it('the threshold act creates an organism with an initial state', async () => {
    contentTypeRegistry.register(createPassthroughContentType());
    const userId = testUserId('creator');

    const result = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { title: 'First Song' },
        createdBy: userId,
      },
      deps(),
    );

    expect(result.organism.createdBy).toBe(userId);
    expect(result.initialState.sequenceNumber).toBe(1);
    expect(result.initialState.payload).toEqual({ title: 'First Song' });
    expect(result.initialState.organismId).toBe(result.organism.id);
  });

  it('creating an organism automatically establishes a stewardship relationship', async () => {
    contentTypeRegistry.register(createPassthroughContentType());
    const userId = testUserId('steward');

    const result = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: { content: 'hello' },
        createdBy: userId,
      },
      deps(),
    );

    const relationships = await relationshipRepository.findByUserAndOrganism(userId, result.organism.id);
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('stewardship');
    expect(relationships[0].userId).toBe(userId);
    expect(relationships[0].organismId).toBe(result.organism.id);
  });

  it('creating an organism emits an organism.created event', async () => {
    contentTypeRegistry.register(createPassthroughContentType());
    const userId = testUserId('actor');

    const result = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: {},
        createdBy: userId,
      },
      deps(),
    );

    const events = eventPublisher.findByType('organism.created');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(result.organism.id);
    expect(events[0].actorId).toBe(userId);
  });

  it('threshold validates the payload against the content type', async () => {
    contentTypeRegistry.register(createRejectingContentType());

    await expect(
      createOrganism(
        {
          contentTypeId: testContentTypeId(),
          payload: { invalid: true },
          createdBy: testUserId(),
        },
        deps(),
      ),
    ).rejects.toThrow(ValidationFailedError);
  });

  it('threshold fails if the content type is not registered', async () => {
    await expect(
      createOrganism(
        {
          contentTypeId: testContentTypeId('unknown-type'),
          payload: {},
          createdBy: testUserId(),
        },
        deps(),
      ),
    ).rejects.toThrow(ContentTypeNotRegisteredError);
  });

  it('an organism defaults to non-open-trunk', async () => {
    contentTypeRegistry.register(createPassthroughContentType());

    const result = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: {},
        createdBy: testUserId(),
      },
      deps(),
    );

    expect(result.organism.openTrunk).toBe(false);
  });

  it('an organism can be created with open-trunk configuration', async () => {
    contentTypeRegistry.register(createPassthroughContentType());

    const result = await createOrganism(
      {
        contentTypeId: testContentTypeId(),
        payload: {},
        createdBy: testUserId(),
        openTrunk: true,
      },
      deps(),
    );

    expect(result.organism.openTrunk).toBe(true);
  });
});
