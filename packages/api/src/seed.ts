/**
 * World map seeding — ensures the global world map organism exists.
 *
 * Called at startup. Creates the world map if it doesn't exist,
 * stores its ID in the platform_config table for retrieval.
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig, users } from './db/schema.js';

const WORLD_MAP_KEY = 'world_map_id';
const SYSTEM_USER_ID = 'system' as UserId;
const WORLD_MAP_WIDTH = 5_000;
const WORLD_MAP_HEIGHT = 5_000;
const WORLD_MAP_MIN_SEPARATION = 1;

export async function seedWorldMap(container: Container): Promise<OrganismId> {
  // Check if world map already exists
  const existing = await container.db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY));

  if (existing.length > 0) {
    const existingWorldMapId = existing[0].value as OrganismId;
    const existingOrganism = await container.organismRepository.findById(existingWorldMapId);
    const existingState = await container.stateRepository.findCurrentByOrganismId(existingWorldMapId);

    if (existingOrganism && existingState?.contentTypeId === ('spatial-map' as ContentTypeId)) {
      // Ensure the world map is publicly visible for the guest read path.
      await container.visibilityRepository.save({
        organismId: existingWorldMapId,
        level: 'public',
        updatedAt: container.identityGenerator.timestamp(),
      });
      return existingWorldMapId;
    }

    // Stale or invalid world map pointer: recreate and heal platform config.
    const repairedWorldMapId = await createAndPersistWorldMap(container, SYSTEM_USER_ID);
    await container.db
      .update(platformConfig)
      .set({ value: repairedWorldMapId })
      .where(eq(platformConfig.key, WORLD_MAP_KEY));
    return repairedWorldMapId;
  }

  // Ensure system user exists (needed as FK target for world map organism)
  const systemUser = await container.db.select().from(users).where(eq(users.id, SYSTEM_USER_ID));
  if (systemUser.length === 0) {
    await container.db.insert(users).values({
      id: SYSTEM_USER_ID,
      email: 'system@omnilith.local',
      passwordHash: '!locked',
    });
  }

  const worldMapId = await createAndPersistWorldMap(container, SYSTEM_USER_ID);

  // Store in platform config
  await container.db.insert(platformConfig).values({
    key: WORLD_MAP_KEY,
    value: worldMapId,
  });

  return worldMapId;
}

async function createAndPersistWorldMap(container: Container, createdBy: UserId): Promise<OrganismId> {
  const worldMap = await createOrganism(
    {
      name: 'World Map',
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [],
        width: WORLD_MAP_WIDTH,
        height: WORLD_MAP_HEIGHT,
        minSeparation: WORLD_MAP_MIN_SEPARATION,
      },
      createdBy,
      openTrunk: true,
    },
    {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    },
  );

  await container.visibilityRepository.save({
    organismId: worldMap.organism.id,
    level: 'public',
    updatedAt: container.identityGenerator.timestamp(),
  });

  return worldMap.organism.id;
}
