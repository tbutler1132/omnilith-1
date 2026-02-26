import { beforeEach, describe, expect, it } from 'vitest';
import { AccessDeniedError, OrganismNotFoundError } from '../errors.js';
import { changeOpenTrunk } from '../organism/change-open-trunk.js';
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
  testOrganismId,
  testUserId,
} from '../testing/test-helpers.js';

describe('changeOpenTrunk', () => {
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

  const changeDeps = () => ({
    organismRepository,
    visibilityRepository,
    relationshipRepository,
    compositionRepository,
    eventPublisher,
    identityGenerator,
  });

  it('the steward can switch an organism from open-trunk to regulated mode', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      {
        name: 'Draft',
        contentTypeId: testContentTypeId(),
        payload: {},
        createdBy: steward,
      },
      createDeps(),
    );

    const updated = await changeOpenTrunk(
      {
        organismId: organism.id,
        openTrunk: false,
        changedBy: steward,
      },
      changeDeps(),
    );

    expect(updated.openTrunk).toBe(false);
    const stored = await organismRepository.findById(organism.id);
    expect(stored?.openTrunk).toBe(false);
  });

  it('a non-steward cannot change open-trunk mode', async () => {
    const steward = testUserId('steward');
    const outsider = testUserId('outsider');
    const { organism } = await createOrganism(
      {
        name: 'Draft',
        contentTypeId: testContentTypeId(),
        payload: {},
        createdBy: steward,
      },
      createDeps(),
    );

    await expect(
      changeOpenTrunk(
        {
          organismId: organism.id,
          openTrunk: false,
          changedBy: outsider,
        },
        changeDeps(),
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('changing open-trunk mode emits organism.open-trunk-changed', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      {
        name: 'Draft',
        contentTypeId: testContentTypeId(),
        payload: {},
        createdBy: steward,
      },
      createDeps(),
    );
    eventPublisher.clear();

    await changeOpenTrunk(
      {
        organismId: organism.id,
        openTrunk: false,
        changedBy: steward,
      },
      changeDeps(),
    );

    const events = eventPublisher.findByType('organism.open-trunk-changed');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(organism.id);
    expect(events[0].payload.openTrunk).toBe(false);
  });

  it('changing open-trunk mode fails for missing organisms', async () => {
    await expect(
      changeOpenTrunk(
        {
          organismId: testOrganismId('missing'),
          openTrunk: false,
          changedBy: testUserId('steward'),
        },
        changeDeps(),
      ),
    ).rejects.toThrow(OrganismNotFoundError);
  });
});
