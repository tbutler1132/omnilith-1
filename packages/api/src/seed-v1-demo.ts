/**
 * V1 demo seed — minimal launch world with two surfaced organisms.
 *
 * Produces a focused public demo:
 * 1) Hero's Journey concept album organism with composed song organisms.
 * 2) Weekly Updates composition with composed text organisms.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig, users } from './db/schema.js';
import { loadHeroJourneyV1DemoBlueprint } from './seed-blueprints/load-hero-journey-v1-demo-blueprint.js';
import { seedHeroJourney } from './seed-helpers/hero-journey.js';

const V1_DEMO_SEED_KEY = 'v1_demo_seed_complete';
const DEMO_USER_EMAIL = 'demo@omnilith.local';
const DEMO_USER_PASSWORD = 'demo';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function seedV1Demo(container: Container): Promise<void> {
  const existing = await container.db.select().from(platformConfig).where(eq(platformConfig.key, V1_DEMO_SEED_KEY));
  if (existing.length > 0) {
    console.log('V1 demo seed already applied.');
    return;
  }

  console.log('Seeding V1 demo world...');

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

  const demoUserId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: demoUserId,
    email: DEMO_USER_EMAIL,
    passwordHash: hashPassword(DEMO_USER_PASSWORD),
  });

  const heroJourneyBlueprint = await loadHeroJourneyV1DemoBlueprint();
  const heroJourney = await seedHeroJourney(container, demoUserId, heroJourneyBlueprint);

  const weeklyUpdates = await createOrganism(
    {
      name: 'Weekly Updates',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'sequential',
      },
      createdBy: demoUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const weeklyEntries: Array<{ organismId: OrganismId; position: number }> = [];
  for (const [index, copy] of [
    'Week 1 — Establishing the narrative arc and sonic palette.',
    'Week 2 — Reworking transitions between trial and return chapters.',
    'Week 3 — Tightening mixes and preparing scene polish.',
  ].entries()) {
    const entry = await createOrganism(
      {
        name: `Weekly Update ${index + 1}`,
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: `# Weekly Update ${index + 1}\n\n${copy}`,
          format: 'markdown',
          metadata: { title: `Weekly Update ${index + 1}` },
        },
        createdBy: demoUserId,
        openTrunk: true,
      },
      createDeps,
    );

    await composeOrganism(
      {
        parentId: weeklyUpdates.organism.id,
        childId: entry.organism.id,
        composedBy: demoUserId,
        position: index,
      },
      composeDeps,
    );

    weeklyEntries.push({ organismId: entry.organism.id, position: index + 1 });
  }

  await appendState(
    {
      organismId: weeklyUpdates.organism.id,
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: weeklyEntries,
        arrangementType: 'sequential',
      },
      appendedBy: demoUserId,
    },
    appendDeps,
  );

  const worldMapRow = await container.db.select().from(platformConfig).where(eq(platformConfig.key, 'world_map_id'));
  if (worldMapRow.length === 0) {
    throw new Error('World map not found — run seedWorldMap first');
  }
  const worldMapId = worldMapRow[0].value as OrganismId;

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [
          { organismId: heroJourney.sceneOrganismId, x: 2440, y: 2360, size: 1.6, emphasis: 0.96 },
          { organismId: weeklyUpdates.organism.id, x: 2920, y: 2620, size: 1.2, emphasis: 0.82 },
        ],
        width: 5000,
        height: 5000,
      },
      appendedBy: 'system' as UserId,
    },
    appendDeps,
  );

  await container.db.insert(platformConfig).values({
    key: V1_DEMO_SEED_KEY,
    value: new Date().toISOString(),
  });

  console.log(`  Hero's Journey: ${heroJourney.sceneOrganismId}`);
  console.log(`  Weekly Updates: ${weeklyUpdates.organism.id}`);
  console.log('V1 demo seed complete.');
}
