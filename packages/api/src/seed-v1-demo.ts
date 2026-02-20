/**
 * V1 demo seed — minimal launch world with core surfaced organisms.
 *
 * Produces a focused demo:
 * 1) Hero's Journey concept album organism with composed song organisms.
 * 2) Weekly Updates composition with composed text organisms.
 * 3) A private community organism with its own internal map.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig, sessions, users } from './db/schema.js';
import { loadHeroJourneyV1DemoBlueprint } from './seed-blueprints/load-hero-journey-v1-demo-blueprint.js';
import { seedHeroJourney } from './seed-helpers/hero-journey.js';

const V1_DEMO_SEED_KEY = 'v1_demo_seed_complete';
const DEMO_USER_EMAIL = 'demo@omnilith.local';
const DEMO_USER_PASSWORD = 'demo';
const DEV_USER_EMAIL = 'dev@omnilith.local';
const DEV_USER_PASSWORD = 'dev';
const DEV_SESSION_ID = 'dev-session-00000000';

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

  const devUserId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: devUserId,
    email: DEV_USER_EMAIL,
    passwordHash: hashPassword(DEV_USER_PASSWORD),
  });

  await container.db.insert(sessions).values({
    id: DEV_SESSION_ID,
    userId: devUserId,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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

  // Community: The Undergrowth
  const undergrowthMap = await createOrganism(
    {
      name: 'The Undergrowth Map',
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [],
        width: 2000,
        height: 2000,
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const undergrowth = await createOrganism(
    {
      name: 'The Undergrowth',
      contentTypeId: 'community' as ContentTypeId,
      payload: {
        description:
          'A collective of field recordists exploring the sonic edges of landscape, weather, and forgetting.',
        mapOrganismId: undergrowthMap.organism.id,
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  await composeOrganism(
    { parentId: undergrowth.organism.id, childId: undergrowthMap.organism.id, composedBy: devUserId },
    composeDeps,
  );

  const communityText = await createOrganism(
    {
      name: 'Listening Practice',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Listening Practice',
          '',
          'Go outside. Close your eyes.',
          'Count the layers of sound.',
          'The ones you can name. The ones you cannot.',
          '',
          'Come back and write down what you heard.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityAudio = await createOrganism(
    {
      name: 'Rain on Tin',
      contentTypeId: 'audio' as ContentTypeId,
      payload: {
        fileReference: 'dev/audio/rain-on-tin.flac',
        durationSeconds: 423,
        format: 'flac',
        sampleRate: 48000,
        metadata: { title: 'Rain on Tin', artist: 'Member Recording' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  await composeOrganism(
    { parentId: undergrowth.organism.id, childId: communityText.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: undergrowth.organism.id, childId: communityAudio.organism.id, composedBy: devUserId },
    composeDeps,
  );

  await appendState(
    {
      organismId: undergrowthMap.organism.id,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [
          { organismId: communityText.organism.id, x: 800, y: 900, size: 1.0, emphasis: 0.8 },
          { organismId: communityAudio.organism.id, x: 1200, y: 1100, size: 1.1, emphasis: 0.9 },
        ],
        width: 2000,
        height: 2000,
      },
      appendedBy: devUserId,
    },
    appendDeps,
  );

  await container.relationshipRepository.save({
    id: container.identityGenerator.relationshipId(),
    type: 'membership',
    userId: demoUserId,
    organismId: undergrowth.organism.id,
    role: 'member',
    createdAt: container.identityGenerator.timestamp(),
  });

  await container.visibilityRepository.save({
    organismId: undergrowth.organism.id,
    level: 'private',
    updatedAt: container.identityGenerator.timestamp(),
  });
  await container.visibilityRepository.save({
    organismId: undergrowthMap.organism.id,
    level: 'members',
    updatedAt: container.identityGenerator.timestamp(),
  });
  await container.visibilityRepository.save({
    organismId: communityText.organism.id,
    level: 'members',
    updatedAt: container.identityGenerator.timestamp(),
  });
  await container.visibilityRepository.save({
    organismId: communityAudio.organism.id,
    level: 'members',
    updatedAt: container.identityGenerator.timestamp(),
  });

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
          { organismId: undergrowth.organism.id, x: 2650, y: 2910, size: 1.35, emphasis: 0.9 },
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
  console.log(`  Community "The Undergrowth": ${undergrowth.organism.id} (private)`);
  console.log(`  Dev user: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD} (session: ${DEV_SESSION_ID})`);
  console.log(`  Demo user: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log('V1 demo seed complete.');
}
