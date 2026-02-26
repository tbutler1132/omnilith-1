/**
 * World-map-only seed profile.
 *
 * Boots a simplified local world: one governing Text boundary at world
 * center and a small set of organisms surfaced directly on the world map.
 * Community organisms are intentionally not surfaced in this profile.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig, users } from './db/schema.js';
import { parseSpatialMapPayload, type SpatialMapEntrySnapshot } from './surface/spatial-map-payload.js';

const WORLD_MAP_ONLY_SEED_KEY = 'world_map_only_seed_complete';
const WORLD_MAP_KEY = 'world_map_id';
const DEV_USER_EMAIL = 'dev@omnilith.local';
const DEV_USER_PASSWORD = 'dev';
const WORLD_MAP_WIDTH = 5_000;
const WORLD_MAP_HEIGHT = 5_000;
const WORLD_MAP_CENTER_X = Math.floor(WORLD_MAP_WIDTH / 2);
const WORLD_MAP_CENTER_Y = Math.floor(WORLD_MAP_HEIGHT / 2);
const WORLD_MAP_MIN_SEPARATION = 1;
const UNIT_SIZE = 1;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function roundCoordinate(value: number): number {
  return Math.round(value);
}

function sizeDiffers(current: number | undefined, next: number): boolean {
  if (current === undefined) return true;
  return Math.abs(current - next) > Number.EPSILON;
}

async function ensureDevUser(container: Container): Promise<UserId> {
  const existingDevUser = await container.db.select().from(users).where(eq(users.email, DEV_USER_EMAIL));
  if (existingDevUser.length > 0) {
    return existingDevUser[0].id as UserId;
  }

  const userId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: userId,
    email: DEV_USER_EMAIL,
    passwordHash: hashPassword(DEV_USER_PASSWORD),
  });

  console.log(`World-map-only seed ensured dev user: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD}`);
  return userId;
}

async function normalizeWorldMapToUnitGrid(container: Container, worldMapId: OrganismId): Promise<void> {
  const currentMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
  if (!currentMapState || currentMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
    return;
  }

  const mapPayload = parseSpatialMapPayload(currentMapState.payload);
  if (!mapPayload) {
    return;
  }

  const nextEntries: SpatialMapEntrySnapshot[] = [];
  let changedEntries = false;

  for (const entry of mapPayload.entries) {
    const entryState = await container.stateRepository.findCurrentByOrganismId(entry.organismId);
    if (entryState?.contentTypeId === 'community') {
      changedEntries = true;
      continue;
    }

    const nextX = roundCoordinate(entry.x);
    const nextY = roundCoordinate(entry.y);
    if (nextX !== entry.x || nextY !== entry.y || sizeDiffers(entry.size, UNIT_SIZE)) {
      changedEntries = true;
    }

    nextEntries.push({
      ...entry,
      x: nextX,
      y: nextY,
      size: UNIT_SIZE,
    });
  }

  const dimensionsChanged = mapPayload.width !== WORLD_MAP_WIDTH || mapPayload.height !== WORLD_MAP_HEIGHT;
  const minSeparationChanged = mapPayload.minSeparation !== WORLD_MAP_MIN_SEPARATION;
  const entryCountChanged = nextEntries.length !== mapPayload.entries.length;

  if (!changedEntries && !dimensionsChanged && !minSeparationChanged && !entryCountChanged) {
    return;
  }

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
      appendedBy: currentMapState.createdBy,
    },
    {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      identityGenerator: container.identityGenerator,
      visibilityRepository: container.visibilityRepository,
      relationshipRepository: container.relationshipRepository,
      compositionRepository: container.compositionRepository,
    },
  );

  console.log(
    `[world-map-only] normalized world map ${worldMapId}: removed-community=${entryCountChanged ? 'yes' : 'no'}, changed=${changedEntries || dimensionsChanged || minSeparationChanged}`,
  );
}

export async function seedWorldMapOnly(container: Container): Promise<void> {
  const devUserId = await ensureDevUser(container);

  const worldMapRow = await container.db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY));
  if (worldMapRow.length === 0) {
    throw new Error('World map not found — run seedWorldMap first');
  }
  const worldMapId = worldMapRow[0].value as OrganismId;

  await normalizeWorldMapToUnitGrid(container, worldMapId);

  const existing = await container.db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, WORLD_MAP_ONLY_SEED_KEY));

  if (existing.length > 0) {
    console.log('OMNILITH_SEED_PROFILE=world-map-only already applied.');
    return;
  }

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

  const worldBoundary = await createOrganism(
    {
      name: 'World Boundary',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# World Boundary',
          '',
          'Temporary simplification boundary for active rebuilding.',
          '',
          '- Governs surfaced organisms through a single integrator policy.',
          '- World map uses unit-grid semantics (1 organism = 1 grid unit).',
          '- Legacy community entries are intentionally unsurfaced.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const worldBoundaryPolicy = await createOrganism(
    {
      name: 'world-boundary-integration-policy',
      contentTypeId: 'integration-policy' as ContentTypeId,
      payload: {
        mode: 'single-integrator',
        integratorId: devUserId,
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const fieldNote = await createOrganism(
    {
      name: 'World Field Note',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: ['# World Field Note', '', 'Seeded directly onto the world map for Space and Visor tending.'].join(
          '\n',
        ),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const worldSong = await createOrganism(
    {
      name: 'World Song Sketch',
      contentTypeId: 'song' as ContentTypeId,
      payload: {
        title: 'World Song Sketch',
        artistCredit: 'Dev User',
        status: 'draft',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  await composeOrganism(
    {
      parentId: worldBoundary.organism.id,
      childId: worldBoundaryPolicy.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );

  await composeOrganism(
    {
      parentId: worldBoundary.organism.id,
      childId: fieldNote.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );

  await composeOrganism(
    {
      parentId: worldBoundary.organism.id,
      childId: worldSong.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );

  const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
  if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
    throw new Error('World map is missing a spatial-map current state.');
  }

  const worldMapPayload = parseSpatialMapPayload(worldMapState.payload);
  if (!worldMapPayload) {
    throw new Error('World map payload is invalid.');
  }

  const existingEntriesById = new Map(worldMapPayload.entries.map((entry) => [entry.organismId, entry]));
  const seededEntries: ReadonlyArray<SpatialMapEntrySnapshot> = [
    {
      organismId: worldBoundary.organism.id,
      x: WORLD_MAP_CENTER_X,
      y: WORLD_MAP_CENTER_Y,
      size: UNIT_SIZE,
      emphasis: 1,
    },
    {
      organismId: fieldNote.organism.id,
      x: WORLD_MAP_CENTER_X + 4,
      y: WORLD_MAP_CENTER_Y - 2,
      size: UNIT_SIZE,
      emphasis: 0.8,
    },
    {
      organismId: worldSong.organism.id,
      x: WORLD_MAP_CENTER_X - 5,
      y: WORLD_MAP_CENTER_Y + 3,
      size: UNIT_SIZE,
      emphasis: 0.82,
    },
  ];

  const mergedEntries = [
    ...worldMapPayload.entries.filter(
      (entry) => !seededEntries.some((seeded) => seeded.organismId === entry.organismId),
    ),
    ...seededEntries,
  ].map((entry) => {
    const existingEntry = existingEntriesById.get(entry.organismId);
    return {
      ...entry,
      x: roundCoordinate(existingEntry?.x ?? entry.x),
      y: roundCoordinate(existingEntry?.y ?? entry.y),
      size: UNIT_SIZE,
    };
  });

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: mergedEntries,
        width: WORLD_MAP_WIDTH,
        height: WORLD_MAP_HEIGHT,
        minSeparation: WORLD_MAP_MIN_SEPARATION,
      },
      appendedBy: devUserId,
    },
    appendDeps,
  );

  await container.db.insert(platformConfig).values({
    key: WORLD_MAP_ONLY_SEED_KEY,
    value: 'true',
  });

  console.log('Seed complete: OMNILITH_SEED_PROFILE=world-map-only');
  console.log(`  World Map: ${worldMapId}`);
  console.log(`  World Boundary: ${worldBoundary.organism.id}`);
  console.log(`  Integration Policy: ${worldBoundaryPolicy.organism.id}`);
  console.log(`  World Field Note: ${fieldNote.organism.id}`);
  console.log(`  World Song Sketch: ${worldSong.organism.id}`);
}
