/**
 * Derived surface entry size tests.
 *
 * Verifies unit-grid sizing semantics for all surfaced organisms.
 */

import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeId, ContentTypeRegistry, OrganismId, UserId } from '@omnilith/kernel';
import { createOrganism } from '@omnilith/kernel';
import {
  createTestIdentityGenerator,
  InMemoryCompositionRepository,
  InMemoryContentTypeRegistry,
  InMemoryEventPublisher,
  InMemoryOrganismRepository,
  InMemoryRelationshipRepository,
  InMemoryStateRepository,
  InMemorySurfaceRepository,
  resetIdCounter,
} from '@omnilith/kernel/src/testing/index.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { deriveSurfaceEntrySize, UNIT_GRID_SURFACE_SIZE } from '../surface/derive-surface-entry-size.js';

const TEST_USER = 'test-user' as UserId;

function createRegistry(): ContentTypeRegistry {
  const registry = new InMemoryContentTypeRegistry();
  for (const ct of allContentTypes) {
    registry.register(ct);
  }
  return registry as ContentTypeRegistry;
}

function createDeps() {
  const organismRepository = new InMemoryOrganismRepository();
  const stateRepository = new InMemoryStateRepository();
  const compositionRepository = new InMemoryCompositionRepository();
  const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
  const relationshipRepository = new InMemoryRelationshipRepository();
  const eventPublisher = new InMemoryEventPublisher();
  const identityGenerator = createTestIdentityGenerator();
  const contentTypeRegistry = createRegistry();

  return {
    organismRepository,
    stateRepository,
    compositionRepository,
    surfaceRepository,
    relationshipRepository,
    eventPublisher,
    identityGenerator,
    contentTypeRegistry,
  };
}

describe('deriveSurfaceEntrySize', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('returns unit-grid size for text organisms', async () => {
    const deps = createDeps();

    const text = await createOrganism(
      {
        name: 'Field Note',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'hello world', format: 'markdown' },
        createdBy: TEST_USER,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        contentTypeRegistry: deps.contentTypeRegistry,
        eventPublisher: deps.eventPublisher,
        relationshipRepository: deps.relationshipRepository,
        identityGenerator: deps.identityGenerator,
      },
    );

    const derived = await deriveSurfaceEntrySize(
      { organismId: text.organism.id },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        compositionRepository: deps.compositionRepository,
        surfaceRepository: deps.surfaceRepository,
      },
    );

    expect(derived.strategy).toBe('unit-grid');
    expect(derived.size).toBe(UNIT_GRID_SURFACE_SIZE);
  });

  it('returns unit-grid size for community organisms', async () => {
    const deps = createDeps();

    const map = await createOrganism(
      {
        name: 'Boundary Map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 1000, height: 1000 },
        createdBy: TEST_USER,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        contentTypeRegistry: deps.contentTypeRegistry,
        eventPublisher: deps.eventPublisher,
        relationshipRepository: deps.relationshipRepository,
        identityGenerator: deps.identityGenerator,
      },
    );

    const community = await createOrganism(
      {
        name: 'Legacy Community',
        contentTypeId: 'community' as ContentTypeId,
        payload: {
          description: 'legacy boundary payload',
          mapOrganismId: map.organism.id,
        },
        createdBy: TEST_USER,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        contentTypeRegistry: deps.contentTypeRegistry,
        eventPublisher: deps.eventPublisher,
        relationshipRepository: deps.relationshipRepository,
        identityGenerator: deps.identityGenerator,
      },
    );

    const derived = await deriveSurfaceEntrySize(
      { organismId: community.organism.id, curationScale: 1.15 },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        compositionRepository: deps.compositionRepository,
        surfaceRepository: deps.surfaceRepository,
      },
    );

    expect(derived.strategy).toBe('unit-grid');
    expect(derived.size).toBe(UNIT_GRID_SURFACE_SIZE);
  });

  it('includes map id and unit metadata when target map is provided', async () => {
    const deps = createDeps();

    const note = await createOrganism(
      {
        name: 'Surface me',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'map entry', format: 'markdown' },
        createdBy: TEST_USER,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        contentTypeRegistry: deps.contentTypeRegistry,
        eventPublisher: deps.eventPublisher,
        relationshipRepository: deps.relationshipRepository,
        identityGenerator: deps.identityGenerator,
      },
    );

    const derived = await deriveSurfaceEntrySize(
      { organismId: note.organism.id, mapOrganismId: 'map-1' as OrganismId },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        compositionRepository: deps.compositionRepository,
        surfaceRepository: deps.surfaceRepository,
      },
    );

    expect(derived.inputs.mapOrganismId).toBe('map-1');
    expect(derived.inputs.unitSize).toBe(UNIT_GRID_SURFACE_SIZE);
  });

  it('throws when target organism does not exist', async () => {
    const deps = createDeps();

    await expect(
      deriveSurfaceEntrySize(
        { organismId: 'missing-organism' as OrganismId },
        {
          organismRepository: deps.organismRepository,
          stateRepository: deps.stateRepository,
          compositionRepository: deps.compositionRepository,
          surfaceRepository: deps.surfaceRepository,
        },
      ),
    ).rejects.toThrow('Organism not found');
  });
});
