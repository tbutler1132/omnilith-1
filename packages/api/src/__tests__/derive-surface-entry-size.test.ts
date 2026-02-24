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

  it('derives baseline community size from a 2000x2000 map', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
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
      },
    );

    expect(derived.strategy).toBe('community-map-area');
    expect(derived.size).toBeCloseTo(1, 8);
  });

  it('derives larger community size for larger map area', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
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
      },
    );

    expect(derived.strategy).toBe('community-map-area');
    expect(derived.size).toBeCloseTo(2, 8);
  });

  it('uses compositional mass for non-community organisms', async () => {
    const organismRepository = new InMemoryOrganismRepository();
    const stateRepository = new InMemoryStateRepository();
    const compositionRepository = new InMemoryCompositionRepository();
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
      },
    );
    const largeSize = await deriveSurfaceEntrySize(
      { organismId: large.organism.id },
      {
        organismRepository,
        stateRepository,
        compositionRepository,
      },
    );

    expect(smallSize.strategy).toBe('compositional-mass');
    expect(largeSize.strategy).toBe('compositional-mass');
    expect(largeSize.size).toBeGreaterThan(smallSize.size);
  });
});
