/**
 * V1 demo seed profile under unit-grid simplification mode.
 *
 * Extends the world-map-only seed with a few extra demo organisms while
 * preserving world-map-first composition and one-unit surfacing semantics.
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig } from './db/schema.js';
import { seedWorldMapOnly } from './seed-world-map-only.js';
import { parseSpatialMapPayload, type SpatialMapEntrySnapshot } from './surface/spatial-map-payload.js';

const V1_DEMO_SEED_KEY = 'v1_demo_seed_complete';
const WORLD_MAP_KEY = 'world_map_id';
const WORLD_MAP_WIDTH = 5_000;
const WORLD_MAP_HEIGHT = 5_000;
const WORLD_MAP_MIN_SEPARATION = 1;
const UNIT_SIZE = 1;

function roundCoordinate(value: number): number {
  return Math.round(value);
}

async function resolveBoundaryOrganismId(container: Container, worldMapId: OrganismId): Promise<OrganismId | null> {
  const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
  if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
    return null;
  }

  const payload = parseSpatialMapPayload(worldMapState.payload);
  if (!payload) {
    return null;
  }

  for (const entry of payload.entries) {
    const organism = await container.organismRepository.findById(entry.organismId);
    if (organism?.name === 'World Boundary') {
      return entry.organismId;
    }
  }

  return null;
}

export async function seedV1Demo(container: Container): Promise<void> {
  await seedWorldMapOnly(container);

  const existing = await container.db.select().from(platformConfig).where(eq(platformConfig.key, V1_DEMO_SEED_KEY));
  if (existing.length > 0) {
    console.log('OMNILITH_SEED_PROFILE=v1-demo already applied.');
    return;
  }

  const worldMapRow = await container.db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY));
  if (worldMapRow.length === 0) {
    throw new Error('World map not found — run seedWorldMap first');
  }

  const worldMapId = worldMapRow[0].value as OrganismId;
  const boundaryOrganismId = await resolveBoundaryOrganismId(container, worldMapId);

  const createDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    contentTypeRegistry: container.contentTypeRegistry,
    eventPublisher: container.eventPublisher,
    relationshipRepository: container.relationshipRepository,
    identityGenerator: container.identityGenerator,
  };

  const composeDeps = {
    organismRepository: container.organismRepository,
    compositionRepository: container.compositionRepository,
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    eventPublisher: container.eventPublisher,
    identityGenerator: container.identityGenerator,
  };

  const appendDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    contentTypeRegistry: container.contentTypeRegistry,
    eventPublisher: container.eventPublisher,
    identityGenerator: container.identityGenerator,
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    compositionRepository: container.compositionRepository,
  };

  const createdBy = 'system' as UserId;

  const heroJourneyScene = await createOrganism(
    {
      name: 'Hero Journey Demo Scene',
      contentTypeId: 'hero-journey-scene' as ContentTypeId,
      payload: {
        title: 'Threshold Crossing',
        subtitle: 'A compact demo scene for world-map-only simplified flow.',
        chapters: [
          {
            phase: 'call',
            title: 'Call',
            summary: 'A weak signal appears at the edge of the boundary.',
          },
          {
            phase: 'crossing',
            title: 'Crossing',
            summary: 'The organism crosses into a new tending phase.',
          },
          {
            phase: 'return',
            title: 'Return',
            summary: 'Learning is carried back into shared practice.',
          },
        ],
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  const projectRepository = await createOrganism(
    {
      name: 'Omnilith Repository',
      contentTypeId: 'github-repository' as ContentTypeId,
      payload: {
        provider: 'github',
        owner: 'tbutler1132',
        name: 'omnilith',
        defaultBranch: 'main',
        repositoryUrl: 'https://github.com/tbutler1132/omnilith',
        sync: {
          status: 'pending',
        },
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  if (boundaryOrganismId) {
    await composeOrganism(
      {
        parentId: boundaryOrganismId,
        childId: heroJourneyScene.organism.id,
        composedBy: createdBy,
      },
      composeDeps,
    );

    await composeOrganism(
      {
        parentId: boundaryOrganismId,
        childId: projectRepository.organism.id,
        composedBy: createdBy,
      },
      composeDeps,
    );
  }

  const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
  if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
    throw new Error('World map is missing a spatial-map current state.');
  }

  const worldMapPayload = parseSpatialMapPayload(worldMapState.payload);
  if (!worldMapPayload) {
    throw new Error('World map payload is invalid.');
  }

  const centerX = Math.floor(WORLD_MAP_WIDTH / 2);
  const centerY = Math.floor(WORLD_MAP_HEIGHT / 2);
  const seededEntries: ReadonlyArray<SpatialMapEntrySnapshot> = [
    {
      organismId: heroJourneyScene.organism.id,
      x: centerX + 9,
      y: centerY + 4,
      size: UNIT_SIZE,
      emphasis: 0.85,
    },
    {
      organismId: projectRepository.organism.id,
      x: centerX - 11,
      y: centerY - 6,
      size: UNIT_SIZE,
      emphasis: 0.86,
    },
  ];

  const dedupedExistingEntries = worldMapPayload.entries.filter(
    (entry) => !seededEntries.some((seeded) => seeded.organismId === entry.organismId),
  );

  const nextEntries = [...dedupedExistingEntries, ...seededEntries].map((entry) => ({
    ...entry,
    x: roundCoordinate(entry.x),
    y: roundCoordinate(entry.y),
    size: UNIT_SIZE,
  }));

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: nextEntries,
        width: WORLD_MAP_WIDTH,
        height: WORLD_MAP_HEIGHT,
        minSeparation: WORLD_MAP_MIN_SEPARATION,
      },
      appendedBy: createdBy,
    },
    appendDeps,
  );

  await container.db.insert(platformConfig).values({
    key: V1_DEMO_SEED_KEY,
    value: 'true',
  });

  console.log('Seed complete: OMNILITH_SEED_PROFILE=v1-demo');
  console.log(`  Hero Journey Demo Scene: ${heroJourneyScene.organism.id}`);
  console.log(`  Omnilith Repository: ${projectRepository.organism.id}`);
}
