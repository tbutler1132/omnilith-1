import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeId, ContentTypeRegistry, RelationshipId, Timestamp, UserId } from '@omnilith/kernel';
import { composeOrganism, createOrganism, openProposal } from '@omnilith/kernel';
import {
  createTestIdentityGenerator,
  InMemoryCompositionRepository,
  InMemoryContentTypeRegistry,
  InMemoryEventPublisher,
  InMemoryOrganismRepository,
  InMemoryProposalRepository,
  InMemoryQueryPort,
  InMemoryRelationshipRepository,
  InMemoryStateRepository,
  InMemoryVisibilityRepository,
  resetIdCounter,
} from '@omnilith/kernel/src/testing/index.js';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '../container.js';
import { createNoopGitHubPlugin } from '../github/plugin.js';
import { NoopProposalIntegrationTrigger } from '../github/proposal-integration-trigger.js';
import { recordProposalIntegrationObservations } from '../regulator/proposal-integration-observation-adapter.js';

function createTestContainer(): Container {
  const registry = new InMemoryContentTypeRegistry();
  for (const ct of allContentTypes) {
    registry.register(ct);
  }

  const organismRepository = new InMemoryOrganismRepository();
  const stateRepository = new InMemoryStateRepository();
  const compositionRepository = new InMemoryCompositionRepository();
  const proposalRepository = new InMemoryProposalRepository();
  const eventPublisher = new InMemoryEventPublisher();
  const relationshipRepository = new InMemoryRelationshipRepository();

  return {
    organismRepository,
    stateRepository,
    compositionRepository,
    proposalRepository,
    eventPublisher,
    eventRepository: eventPublisher,
    visibilityRepository: new InMemoryVisibilityRepository(),
    relationshipRepository,
    contentTypeRegistry: registry as ContentTypeRegistry,
    identityGenerator: createTestIdentityGenerator(),
    queryPort: new InMemoryQueryPort(
      organismRepository,
      stateRepository,
      proposalRepository,
      compositionRepository,
      eventPublisher,
      relationshipRepository,
    ),
    proposalIntegrationTrigger: new NoopProposalIntegrationTrigger(),
    githubPlugin: createNoopGitHubPlugin(),
    db: null as unknown as Container['db'],
  };
}

describe('proposal integration observation adapter', () => {
  let container: Container;
  const steward = 'usr-regulator' as UserId;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
  });

  it('records proposals metric observations for composed sensor organisms', async () => {
    const deps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: 'Initial',
          format: 'plaintext',
        },
        createdBy: steward,
        openTrunk: true,
      },
      deps,
    );

    const sensor = await createOrganism(
      {
        name: 'Proposal Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'proposal-rate',
          targetOrganismId: boundary.organism.id,
          metric: 'proposals',
          readings: [],
        },
        createdBy: steward,
        openTrunk: true,
      },
      deps,
    );

    await composeOrganism(
      { parentId: boundary.organism.id, childId: sensor.organism.id, composedBy: steward },
      {
        organismRepository: container.organismRepository,
        compositionRepository: container.compositionRepository,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
      },
    );

    const proposal = await openProposal(
      {
        organismId: boundary.organism.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: {
          content: 'Follow-up',
          format: 'plaintext',
        },
        description: 'test integration observation',
        proposedBy: steward,
      },
      {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        proposalRepository: container.proposalRepository,
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    const recorded = await recordProposalIntegrationObservations(container, proposal, steward);
    expect(recorded).toBe(1);

    const events = await container.eventRepository.findByOrganismId(sensor.organism.id, 'organism.observed');
    expect(events).toHaveLength(1);

    const payload = events[0].payload as {
      metric: string;
      value: number;
      targetOrganismId: string;
    };

    expect(payload.metric).toBe('proposals');
    expect(payload.value).toBe(1);
    expect(payload.targetOrganismId).toBe(boundary.organism.id);
  });

  it('ignores sensors that are not configured for proposals metric', async () => {
    const deps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: 'Initial',
          format: 'plaintext',
        },
        createdBy: steward,
        openTrunk: true,
      },
      deps,
    );

    const sensor = await createOrganism(
      {
        name: 'Other Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'state-rate',
          targetOrganismId: boundary.organism.id,
          metric: 'state-changes',
          readings: [],
        },
        createdBy: steward,
        openTrunk: true,
      },
      deps,
    );

    await composeOrganism(
      { parentId: boundary.organism.id, childId: sensor.organism.id, composedBy: steward },
      {
        organismRepository: container.organismRepository,
        compositionRepository: container.compositionRepository,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
      },
    );

    const proposal = await openProposal(
      {
        organismId: boundary.organism.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: {
          content: 'Follow-up',
          format: 'plaintext',
        },
        proposedBy: steward,
      },
      {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        proposalRepository: container.proposalRepository,
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    const recorded = await recordProposalIntegrationObservations(container, proposal, steward);
    expect(recorded).toBe(0);
  });

  it('falls back to a sensor-authorized actor when the integrator lacks sensor authority', async () => {
    const boundarySteward = 'usr-boundary-steward' as UserId;
    const sensorSteward = 'usr-sensor-steward' as UserId;
    const boundaryIntegrator = 'usr-boundary-integrator' as UserId;

    const deps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Delegated Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: 'Initial',
          format: 'plaintext',
        },
        createdBy: boundarySteward,
        openTrunk: true,
      },
      deps,
    );

    const sensor = await createOrganism(
      {
        name: 'Delegated Proposal Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'delegated-proposal-rate',
          targetOrganismId: boundary.organism.id,
          metric: 'proposals',
          readings: [],
        },
        createdBy: sensorSteward,
        openTrunk: true,
      },
      deps,
    );

    await composeOrganism(
      { parentId: boundary.organism.id, childId: sensor.organism.id, composedBy: boundarySteward },
      {
        organismRepository: container.organismRepository,
        compositionRepository: container.compositionRepository,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
      },
    );

    await container.relationshipRepository.save({
      id: container.identityGenerator.relationshipId() as RelationshipId,
      type: 'integration-authority',
      userId: boundaryIntegrator,
      organismId: boundary.organism.id,
      createdAt: container.identityGenerator.timestamp() as Timestamp,
    });

    const proposal = await openProposal(
      {
        organismId: boundary.organism.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: {
          content: 'Follow-up',
          format: 'plaintext',
        },
        description: 'delegated integration observation',
        proposedBy: boundarySteward,
      },
      {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        proposalRepository: container.proposalRepository,
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    const recorded = await recordProposalIntegrationObservations(container, proposal, boundaryIntegrator);
    expect(recorded).toBe(1);

    const events = await container.eventRepository.findByOrganismId(sensor.organism.id, 'organism.observed');
    expect(events).toHaveLength(1);
    expect(events[0].actorId).toBe(sensorSteward);
  });
});
