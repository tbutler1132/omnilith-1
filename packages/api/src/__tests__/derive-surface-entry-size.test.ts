/**
 * Derived surface entry size tests.
 *
 * Verifies community map-area sizing and default compositional sizing.
 */

import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeId, ContentTypeRegistry, UserId } from '@omnilith/kernel';
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
import { deriveSurfaceEntrySize } from '../surface/derive-surface-entry-size.js';

const TEST_USER = 'test-user' as UserId;

function createRegistry(): ContentTypeRegistry {
  const registry = new InMemoryContentTypeRegistry();
  for (const ct of allContentTypes) {
    registry.register(ct);
  }
  return registry as ContentTypeRegistry;
}

describe('deriveSurfaceEntrySize', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('derives community size as world-relative area share', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const map = await createOrganism(
      {
        name: 'Community Map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 2000, height: 2000 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const community = await createOrganism(
      {
        name: 'Community',
        contentTypeId: 'community' as ContentTypeId,
        payload: {
          description: 'Test community',
          mapOrganismId: map.organism.id,
        },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const derived = await deriveSurfaceEntrySize(
      { organismId: community.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(derived.strategy).toBe('community-map-area');
    expect(derived.size).toBeCloseTo(0.4, 8);
  });

  it('derives larger community size for larger map area share', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const map = await createOrganism(
      {
        name: 'Large Community Map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 4000, height: 4000 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const community = await createOrganism(
      {
        name: 'Community',
        contentTypeId: 'community' as ContentTypeId,
        payload: {
          description: 'Test community',
          mapOrganismId: map.organism.id,
        },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const derived = await deriveSurfaceEntrySize(
      { organismId: community.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(derived.strategy).toBe('community-map-area');
    expect(derived.size).toBeCloseTo(0.8, 8);
  });

  it('uses compositional mass for non-community organisms', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const small = await createOrganism(
      {
        name: 'Small Text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'a', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const large = await createOrganism(
      {
        name: 'Large Text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'x'.repeat(20_000), format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const smallSize = await deriveSurfaceEntrySize(
      { organismId: small.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );
    const largeSize = await deriveSurfaceEntrySize(
      { organismId: large.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(smallSize.strategy).toBe('compositional-mass');
    expect(largeSize.strategy).toBe('compositional-mass');
    expect(largeSize.size).toBeGreaterThan(smallSize.size);
  });

  it('applies bounded curation scale at derivation time', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const text = await createOrganism(
      {
        name: 'Curated text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'x'.repeat(8_000), format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const map = await createOrganism(
      {
        name: 'Target map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 5000, height: 5000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const baseline = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: map.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );
    const curated = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: map.organism.id, curationScale: 1.1 },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(curated.size).toBeGreaterThan(baseline.size);
  });

  it('does not upscale smaller maps and downscales oversized maps', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const text = await createOrganism(
      {
        name: 'Target-normalized text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'x'.repeat(6_000), format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const smallMap = await createOrganism(
      {
        name: 'Small map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 2000, height: 2000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const referenceMap = await createOrganism(
      {
        name: 'Reference map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 5000, height: 5000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const oversizedMap = await createOrganism(
      {
        name: 'Oversized map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 8000, height: 8000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const onSmallMap = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: smallMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );
    const onReferenceMap = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: referenceMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );
    const onOversizedMap = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: oversizedMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(onSmallMap.size).toBeCloseTo(onReferenceMap.size, 8);
    expect(onReferenceMap.size).toBeGreaterThan(onOversizedMap.size);
  });

  it('allows true sub-floor sizes when deriving on a map', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const text = await createOrganism(
      {
        name: 'Tiny text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'tiny', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const largeMap = await createOrganism(
      {
        name: 'Very large map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 8000, height: 8000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const withoutMapContext = await deriveSurfaceEntrySize(
      { organismId: text.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );
    const withMapContext = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: largeMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(withoutMapContext.size).toBeGreaterThanOrEqual(0.75);
    expect(withMapContext.size).toBeLessThan(withoutMapContext.size);
  });

  it('keeps short text organisms small on map surfaces', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const text = await createOrganism(
      {
        name: 'Short text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'Two short lines.', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const map = await createOrganism(
      {
        name: 'Reference map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 5000, height: 5000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const size = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: map.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(size.size).toBeLessThan(0.5);
  });

  it('preserves source-boundary occupancy share when transferring to world map', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const communityMap = await createOrganism(
      {
        name: 'Community map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 2000, height: 2000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const community = await createOrganism(
      {
        name: 'Community',
        contentTypeId: 'community' as ContentTypeId,
        payload: { description: 'Boundary community', mapOrganismId: communityMap.organism.id },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const text = await createOrganism(
      {
        name: 'Boundary text',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'x'.repeat(12000), format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    await compositionRepository.save({
      parentId: community.organism.id,
      childId: text.organism.id,
      composedAt: identityGenerator.timestamp(),
      composedBy: TEST_USER,
    });

    const worldMap = await createOrganism(
      {
        name: 'World map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: [{ organismId: community.organism.id, x: 100, y: 100, size: 1 }],
          width: 4000,
          height: 4000,
          minSeparation: 48,
        },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const sourceMapText = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: communityMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );
    const worldText = await deriveSurfaceEntrySize(
      { organismId: text.organism.id, mapOrganismId: worldMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(worldText.strategy).toBe('boundary-proportional-transfer');

    const sourceEffectiveUnits = Number(sourceMapText.inputs.effectiveUnits);
    const sourceMapCapacityUnits = Number(sourceMapText.inputs.targetMapCapacityUnits);
    const sourceBoundaryShare = sourceEffectiveUnits / sourceMapCapacityUnits;
    const targetCommunityIconSize = Number(worldText.inputs.targetCommunityIconSize);
    const worldBoundaryShare = (worldText.size * worldText.size) / (targetCommunityIconSize * targetCommunityIconSize);

    expect(worldBoundaryShare).toBeCloseTo(sourceBoundaryShare, 8);
  });

  it('counts unsurfaced descendants recursively in parent size', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const root = await createOrganism(
      {
        name: 'Root',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'root', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const child = await createOrganism(
      {
        name: 'Child',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'child', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const grandchild = await createOrganism(
      {
        name: 'Grandchild',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'grandchild', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    await compositionRepository.save({
      parentId: root.organism.id,
      childId: child.organism.id,
      composedAt: identityGenerator.timestamp(),
      composedBy: TEST_USER,
    });
    await compositionRepository.save({
      parentId: child.organism.id,
      childId: grandchild.organism.id,
      composedAt: identityGenerator.timestamp(),
      composedBy: TEST_USER,
    });

    const withGrandchild = await deriveSurfaceEntrySize(
      { organismId: root.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    await compositionRepository.remove(child.organism.id, grandchild.organism.id);

    const withoutGrandchild = await deriveSurfaceEntrySize(
      { organismId: root.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(withGrandchild.size).toBeGreaterThan(withoutGrandchild.size);
  });

  it('excludes surfaced descendants from parent recursive size', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
    const surfaceRepository = new InMemorySurfaceRepository(stateRepository);
    const relationshipRepository = new InMemoryRelationshipRepository();
    const eventPublisher = new InMemoryEventPublisher();
    const identityGenerator = createTestIdentityGenerator();
    const contentTypeRegistry = createRegistry();

    const root = await createOrganism(
      {
        name: 'Root',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'root', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const child = await createOrganism(
      {
        name: 'Child',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'child', format: 'plaintext' },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    await compositionRepository.save({
      parentId: root.organism.id,
      childId: child.organism.id,
      composedAt: identityGenerator.timestamp(),
      composedBy: TEST_USER,
    });

    const targetMap = await createOrganism(
      {
        name: 'Target map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 5000, height: 5000, minSeparation: 48 },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const unsurfacedChildSize = await deriveSurfaceEntrySize(
      { organismId: root.organism.id, mapOrganismId: targetMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    await createOrganism(
      {
        name: 'Map',
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: [{ organismId: child.organism.id, x: 10, y: 10, size: 1 }],
          width: 2000,
          height: 2000,
        },
        createdBy: TEST_USER,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        relationshipRepository,
        identityGenerator,
      },
    );

    const surfacedChildSize = await deriveSurfaceEntrySize(
      { organismId: root.organism.id, mapOrganismId: targetMap.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
        surfaceRepository,
      },
    );

    expect(unsurfacedChildSize.size).toBeGreaterThan(surfacedChildSize.size);
  });
});
