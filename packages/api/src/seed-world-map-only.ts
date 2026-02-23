/**
 * World-map-only seed profile.
 *
 * Leaves local development data intentionally minimal: bootstrap world map
 * plus a single initial community organism from the v1 demo seed.
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig } from './db/schema.js';

const WORLD_MAP_ONLY_SEED_KEY = 'world_map_only_seed_complete';
const WORLD_MAP_KEY = 'world_map_id';
const SYSTEM_USER_ID = 'system' as UserId;

export async function seedWorldMapOnly(container: Container): Promise<void> {
  const existing = await container.db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, WORLD_MAP_ONLY_SEED_KEY));

  if (existing.length > 0) {
    console.log('OMNILITH_SEED_PROFILE=world-map-only already applied.');
    return;
  }

  const worldMapRow = await container.db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY));
  if (worldMapRow.length === 0) {
    throw new Error('World map not found — run seedWorldMap first');
  }
  const worldMapId = worldMapRow[0].value as OrganismId;

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

  const capitalMap = await createOrganism(
    {
      name: 'Capital Map',
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [],
        width: 2000,
        height: 2000,
      },
      createdBy: SYSTEM_USER_ID,
      openTrunk: true,
    },
    createDeps,
  );

  const capitalCommunity = await createOrganism(
    {
      name: 'Capital Community',
      contentTypeId: 'community' as ContentTypeId,
      payload: {
        description:
          'The initial capital boundary: a creative community with foundational institutions for governance, treasury, membership, and commons.',
        mapOrganismId: capitalMap.organism.id,
      },
      createdBy: SYSTEM_USER_ID,
    },
    createDeps,
  );

  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: capitalMap.organism.id,
      composedBy: SYSTEM_USER_ID,
    },
    composeDeps,
  );

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [{ organismId: capitalCommunity.organism.id, x: 2650, y: 2910, size: 1.35, emphasis: 0.9 }],
        width: 5000,
        height: 5000,
      },
      appendedBy: SYSTEM_USER_ID,
    },
    appendDeps,
  );

  await container.db.insert(platformConfig).values({
    key: WORLD_MAP_ONLY_SEED_KEY,
    value: new Date().toISOString(),
  });

  console.log(`Using OMNILITH_SEED_PROFILE=world-map-only with Capital Community: ${capitalCommunity.organism.id}`);
}
