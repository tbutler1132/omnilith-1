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

export async function seedWorldMap(container: Container): Promise<OrganismId> {
  // Check if world map already exists
  const existing = await container.db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY));

  if (existing.length > 0) {
    return existing[0].value as OrganismId;
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

  // Create world map organism
  const worldMap = await createOrganism(
    {
      name: 'World Map',
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: { entries: [], width: 5000, height: 5000 },
      createdBy: SYSTEM_USER_ID,
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

  // Store in platform config
  await container.db.insert(platformConfig).values({
    key: WORLD_MAP_KEY,
    value: worldMap.organism.id,
  });

  return worldMap.organism.id;
}
