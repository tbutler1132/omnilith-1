import { beforeEach, describe, expect, it } from 'vitest';
import { AccessDeniedError, ValidationFailedError } from '../errors.js';
import { recordObservation } from '../events/record-observation.js';
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

describe('recordObservation', () => {
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

  const observationDeps = () => ({
    organismRepository,
    eventPublisher,
    identityGenerator,
    visibilityRepository,
    relationshipRepository,
    compositionRepository,
  });

  it('recording an observation emits an organism.observed event', async () => {
    const steward = testUserId('steward');
    const { organism: sensor } = await createOrganism(
      { name: 'Sensor', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );
    const { organism: target } = await createOrganism(
      { name: 'Target', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    eventPublisher.clear();

    await recordObservation(
      {
        organismId: sensor.id,
        targetOrganismId: target.id,
        metric: 'state-changes',
        value: 7,
        sampledAt: testTimestamp(),
        observedBy: steward,
      },
      observationDeps(),
    );

    const events = eventPublisher.findByType('organism.observed');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(sensor.id);
    expect(events[0].payload.targetOrganismId).toBe(target.id);
    expect(events[0].payload.metric).toBe('state-changes');
    expect(events[0].payload.value).toBe(7);
  });

  it('a non-steward cannot record observations', async () => {
    const steward = testUserId('steward');
    const outsider = testUserId('outsider');
    const { organism: sensor } = await createOrganism(
      { name: 'Sensor', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );
    const { organism: target } = await createOrganism(
      { name: 'Target', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    await expect(
      recordObservation(
        {
          organismId: sensor.id,
          targetOrganismId: target.id,
          metric: 'state-changes',
          value: 3,
          sampledAt: testTimestamp(),
          observedBy: outsider,
        },
        observationDeps(),
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('recording an observation against a private target requires view access to the target organism', async () => {
    const observer = testUserId('observer');
    const targetSteward = testUserId('target-steward');
    const { organism: sensor } = await createOrganism(
      { name: 'Sensor', contentTypeId: testContentTypeId(), payload: {}, createdBy: observer },
      createDeps(),
    );
    const { organism: target } = await createOrganism(
      { name: 'Private Target', contentTypeId: testContentTypeId(), payload: {}, createdBy: targetSteward },
      createDeps(),
    );

    await visibilityRepository.save({
      organismId: target.id,
      level: 'private',
      updatedAt: testTimestamp(),
    });

    await expect(
      recordObservation(
        {
          organismId: sensor.id,
          targetOrganismId: target.id,
          metric: 'state-changes',
          value: 3,
          sampledAt: testTimestamp(),
          observedBy: observer,
        },
        observationDeps(),
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('recording an observation with invalid payload fails validation', async () => {
    const steward = testUserId('steward');
    const { organism: sensor } = await createOrganism(
      { name: 'Sensor', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );
    const { organism: target } = await createOrganism(
      { name: 'Target', contentTypeId: testContentTypeId(), payload: {}, createdBy: steward },
      createDeps(),
    );

    await expect(
      recordObservation(
        {
          organismId: sensor.id,
          targetOrganismId: target.id,
          metric: '',
          value: Number.NaN,
          sampledAt: testTimestamp(),
          observedBy: steward,
        },
        observationDeps(),
      ),
    ).rejects.toThrow(ValidationFailedError);
  });
});
