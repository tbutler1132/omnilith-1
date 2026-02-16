/**
 * Dev seed — populates the database with a rich development world.
 *
 * Creates a dev user, a variety of organisms across content types,
 * composes them into meaningful structures, and surfaces them on the
 * world map. Run once against a fresh database after the world map
 * seed has completed.
 *
 * Uses kernel use cases so all validation, events, and relationships
 * are properly established.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism, openProposal } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { organisms, platformConfig, sessions, users } from './db/schema.js';

const DEV_SEED_KEY = 'dev_seed_complete';
const SONG_STARTER_TEMPLATE_KEY = 'dev_song_starter_template_id';
const DEV_USER_EMAIL = 'dev@omnilith.local';
const DEV_USER_PASSWORD = 'dev';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function ensureSongStarterTemplate(container: Container, devUserId: UserId): Promise<void> {
  const existingTemplateKey = await container.db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, SONG_STARTER_TEMPLATE_KEY));

  if (existingTemplateKey.length > 0) {
    return;
  }

  const namedTemplates = await container.db.select().from(organisms).where(eq(organisms.name, 'Song Starter'));

  for (const candidate of namedTemplates) {
    const currentState = await container.stateRepository.findCurrentByOrganismId(candidate.id as OrganismId);
    if (currentState?.contentTypeId === 'template') {
      await container.db.insert(platformConfig).values({
        key: SONG_STARTER_TEMPLATE_KEY,
        value: candidate.id,
      });
      return;
    }
  }

  const songTemplate = await createOrganism(
    {
      name: 'Song Starter',
      contentTypeId: 'template' as ContentTypeId,
      payload: {
        name: 'Song Starter',
        description: 'Creates a song organism with cover art, source project, stems, and a starter mix.',
        recipe: [
          {
            ref: 'song',
            contentTypeId: 'song',
            initialPayload: {
              title: 'Untitled Song',
              artistCredit: 'Dev User',
              status: 'draft',
              tempoBpm: 120,
              keySignature: 'A minor',
            },
          },
          {
            ref: 'cover',
            contentTypeId: 'image',
            initialPayload: {
              fileReference: 'dev/images/cover-placeholder.jpg',
              width: 1600,
              height: 1600,
              format: 'jpg',
              metadata: { title: 'Cover Art' },
            },
            composeInto: 'song',
            position: 0,
          },
          {
            ref: 'source',
            contentTypeId: 'daw-project',
            initialPayload: {
              fileReference: 'dev/projects/untitled-song-v1.als',
              daw: 'ableton-live',
              format: 'als',
              versionLabel: 'v1',
            },
            composeInto: 'song',
            position: 1,
          },
          {
            ref: 'stems',
            contentTypeId: 'stems-bundle',
            initialPayload: {
              fileReference: 'dev/stems/untitled-song-v1.zip',
              format: 'zip',
              stemCount: 10,
              sampleRate: 48000,
              bitDepth: 24,
            },
            composeInto: 'song',
            position: 2,
          },
          {
            ref: 'mix-1',
            contentTypeId: 'audio',
            initialPayload: {
              fileReference: 'dev/audio/untitled-song-mix-1.wav',
              durationSeconds: 180,
              format: 'wav',
              sampleRate: 48000,
              metadata: { title: 'Mix 1', artist: 'Dev User' },
            },
            composeInto: 'song',
            position: 3,
          },
        ],
      },
      createdBy: devUserId,
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

  await container.db.insert(platformConfig).values({
    key: SONG_STARTER_TEMPLATE_KEY,
    value: songTemplate.organism.id,
  });

  console.log(`  Template "Song Starter": ${songTemplate.organism.id}`);
}

export async function seedDev(container: Container): Promise<void> {
  // Skip if already seeded
  const existing = await container.db.select().from(platformConfig).where(eq(platformConfig.key, DEV_SEED_KEY));

  if (existing.length > 0) {
    const devUser = await container.db.select().from(users).where(eq(users.email, DEV_USER_EMAIL));
    if (devUser.length > 0) {
      await ensureSongStarterTemplate(container, devUser[0].id as UserId);
    }
    console.log('Dev seed already applied, ensured Song Starter template.');
    return;
  }

  console.log('Seeding dev environment...');

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

  const proposalDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    proposalRepository: container.proposalRepository,
    contentTypeRegistry: container.contentTypeRegistry,
    eventPublisher: container.eventPublisher,
    identityGenerator: container.identityGenerator,
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    compositionRepository: container.compositionRepository,
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

  // --- Dev user ---

  const devUserId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: devUserId,
    email: DEV_USER_EMAIL,
    passwordHash: hashPassword(DEV_USER_PASSWORD),
  });

  // Create a persistent session so the dev user stays logged in
  const devSessionId = 'dev-session-00000000';
  await container.db.insert(sessions).values({
    id: devSessionId,
    userId: devUserId,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  // Second user (for proposals from someone else)
  const guestUserId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: guestUserId,
    email: 'guest@omnilith.local',
    passwordHash: hashPassword('guest'),
  });

  console.log(`  Dev user: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD}`);
  console.log(`  Guest user: guest@omnilith.local / guest`);

  // --- Organisms ---

  // 1. A poem (text/markdown)
  const poem = await createOrganism(
    {
      name: 'The Garden at Night',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# The Garden at Night',
          '',
          'The soil remembers what the air forgets—',
          'each seed a quiet argument with stone,',
          'each root a sentence written in the dark.',
          '',
          'We come here not to plant but to attend.',
          'The garden does not need us. We need it.',
        ].join('\n'),
        format: 'markdown',
        metadata: { title: 'The Garden at Night' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Poem: ${poem.organism.id}`);

  // 2. An essay (text/markdown, with state history)
  const essay = await createOrganism(
    {
      name: 'On Tending',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# On Tending',
          '',
          'To tend is not to control. It is to pay attention.',
          '',
          'A gardener does not make things grow.',
          'A gardener creates conditions for growth.',
        ].join('\n'),
        format: 'markdown',
        metadata: { title: 'On Tending' },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  // Append a second state to give it history
  await appendState(
    {
      organismId: essay.organism.id,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# On Tending',
          '',
          'To tend is not to control. It is to pay attention.',
          '',
          'A gardener does not make things grow.',
          'A gardener creates conditions for growth.',
          'The same is true of creative work—',
          'we do not force coherence, we notice it.',
          '',
          'Stewardship is the act of noticing,',
          'and then committing to what you noticed.',
        ].join('\n'),
        format: 'markdown',
        metadata: { title: 'On Tending' },
      },
      appendedBy: devUserId,
    },
    appendDeps,
  );
  console.log(`  Essay (2 states): ${essay.organism.id}`);

  // 3. An audio organism (a track)
  const track1 = await createOrganism(
    {
      name: 'Morning Field Recording',
      contentTypeId: 'audio' as ContentTypeId,
      payload: {
        fileReference: 'dev/audio/morning-field-recording.flac',
        durationSeconds: 247,
        format: 'flac',
        sampleRate: 44100,
        metadata: { title: 'Morning Field Recording', artist: 'Dev User' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Track 1: ${track1.organism.id}`);

  // 4. Another audio organism
  const track2 = await createOrganism(
    {
      name: 'Dusk Variations',
      contentTypeId: 'audio' as ContentTypeId,
      payload: {
        fileReference: 'dev/audio/dusk-variations.mp3',
        durationSeconds: 184,
        format: 'mp3',
        metadata: { title: 'Dusk Variations', artist: 'Dev User' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Track 2: ${track2.organism.id}`);

  // 5. A third audio organism
  const track3 = await createOrganism(
    {
      name: 'Concrete and Moss',
      contentTypeId: 'audio' as ContentTypeId,
      payload: {
        fileReference: 'dev/audio/concrete-and-moss.wav',
        durationSeconds: 312,
        format: 'wav',
        sampleRate: 48000,
        metadata: { title: 'Concrete and Moss', artist: 'Dev User' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Track 3: ${track3.organism.id}`);

  // 6. An album (composition-reference containing the tracks)
  const album = await createOrganism(
    {
      name: 'Field Studies',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [
          { organismId: track1.organism.id, position: 1 },
          { organismId: track2.organism.id, position: 2 },
          { organismId: track3.organism.id, position: 3 },
        ],
        arrangementType: 'sequential',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  // Compose the tracks inside the album
  await composeOrganism(
    { parentId: album.organism.id, childId: track1.organism.id, composedBy: devUserId, position: 1 },
    composeDeps,
  );
  await composeOrganism(
    { parentId: album.organism.id, childId: track2.organism.id, composedBy: devUserId, position: 2 },
    composeDeps,
  );
  await composeOrganism(
    { parentId: album.organism.id, childId: track3.organism.id, composedBy: devUserId, position: 3 },
    composeDeps,
  );
  console.log(`  Album (3 tracks composed): ${album.organism.id}`);

  await ensureSongStarterTemplate(container, devUserId);

  // 7. An image organism
  const photograph = await createOrganism(
    {
      name: 'Overgrown Wall',
      contentTypeId: 'image' as ContentTypeId,
      payload: {
        fileReference: 'dev/images/overgrown-wall.jpg',
        width: 2400,
        height: 1600,
        format: 'jpg',
        metadata: { title: 'Overgrown Wall', location: 'East side' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Photograph: ${photograph.organism.id}`);

  // 8. Another image
  const sketch = await createOrganism(
    {
      name: 'Topology Sketch',
      contentTypeId: 'image' as ContentTypeId,
      payload: {
        fileReference: 'dev/images/topology-sketch.png',
        width: 1200,
        height: 900,
        format: 'png',
        metadata: { title: 'Topology Sketch' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Sketch: ${sketch.organism.id}`);

  // 9. A regulated organism with an integration policy
  const regulatedWork = await createOrganism(
    {
      name: 'Collaborative Manifesto',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Collaborative Manifesto',
          '',
          'This organism is governed. Changes require a proposal.',
          'The integrator decides what enters.',
        ].join('\n'),
        format: 'markdown',
        metadata: { title: 'Collaborative Manifesto' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const policy = await createOrganism(
    {
      name: 'Integration Policy',
      contentTypeId: 'integration-policy' as ContentTypeId,
      payload: {
        mode: 'single-integrator',
        integratorId: devUserId,
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  // Compose the policy inside the regulated work
  await composeOrganism(
    { parentId: regulatedWork.organism.id, childId: policy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  console.log(`  Regulated work + policy: ${regulatedWork.organism.id}`);

  // 10. Open proposal from guest user on the regulated work
  const guestProposal = await openProposal(
    {
      organismId: regulatedWork.organism.id,
      proposedContentTypeId: 'text' as ContentTypeId,
      proposedPayload: {
        content: [
          '# Collaborative Manifesto',
          '',
          'This organism is governed. Changes require a proposal.',
          'The integrator decides what enters.',
          '',
          '## Addendum',
          '',
          'But governance should serve the work, not the other way around.',
        ].join('\n'),
        format: 'markdown',
        metadata: { title: 'Collaborative Manifesto' },
      },
      proposedBy: guestUserId,
    },
    proposalDeps,
  );
  console.log(`  Open proposal: ${guestProposal.id}`);

  // 11. A thread (open-trunk conversation)
  const thread = await createOrganism(
    {
      name: 'What does tending mean to you?',
      contentTypeId: 'thread' as ContentTypeId,
      payload: {
        title: 'What does tending mean to you?',
        appendOnly: true,
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );
  console.log(`  Thread: ${thread.organism.id}`);

  // 12. A dormant text organism (no recent activity)
  const dormantNote = await createOrganism(
    {
      name: 'Unfinished Thought',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: 'A half-finished thought from long ago.',
        format: 'plaintext',
        metadata: { title: 'Unfinished Thought' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );
  console.log(`  Dormant note: ${dormantNote.organism.id}`);

  // --- Community: The Undergrowth ---

  // Community spatial map — the navigable surface inside the community
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

  // The community organism itself
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

  // Compose the map inside the community
  await composeOrganism(
    { parentId: undergrowth.organism.id, childId: undergrowthMap.organism.id, composedBy: devUserId },
    composeDeps,
  );

  // Community-specific organisms
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

  // Compose organisms inside the community boundary
  await composeOrganism(
    { parentId: undergrowth.organism.id, childId: communityText.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: undergrowth.organism.id, childId: communityAudio.organism.id, composedBy: devUserId },
    composeDeps,
  );

  // Surface organisms on the community's map
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

  console.log(`  Community "The Undergrowth": ${undergrowth.organism.id}`);
  console.log(`    Map: ${undergrowthMap.organism.id}`);
  console.log(`    Children: ${communityText.organism.id}, ${communityAudio.organism.id}`);

  // --- Surface organisms on the world map ---

  const worldMapRow = await container.db.select().from(platformConfig).where(eq(platformConfig.key, 'world_map_id'));

  if (worldMapRow.length === 0) {
    throw new Error('World map not found — run seedWorldMap first');
  }

  const worldMapId = worldMapRow[0].value as OrganismId;
  const systemUserId = 'system' as UserId;

  // Build the map entries — scattered across a 5000x5000 space
  const mapEntries: Array<{
    organismId: OrganismId;
    x: number;
    y: number;
    size?: number;
    emphasis?: number;
  }> = [
    // Central cluster — the main works
    { organismId: album.organism.id, x: 2500, y: 2300, size: 1.4, emphasis: 0.9 },
    { organismId: essay.organism.id, x: 2200, y: 2500, size: 1.1, emphasis: 0.8 },
    { organismId: photograph.organism.id, x: 2800, y: 2600, size: 1.2 },

    // Slightly further out
    { organismId: poem.organism.id, x: 1800, y: 2100, size: 1.0, emphasis: 0.7 },
    { organismId: regulatedWork.organism.id, x: 3100, y: 2100, size: 1.3, emphasis: 0.85 },
    { organismId: thread.organism.id, x: 2600, y: 1800, size: 0.9 },

    // Periphery
    { organismId: sketch.organism.id, x: 1500, y: 3000, size: 0.8 },
    { organismId: dormantNote.organism.id, x: 3500, y: 3200, size: 0.6, emphasis: 0.2 },

    // Community
    { organismId: undergrowth.organism.id, x: 1900, y: 2800, size: 1.5, emphasis: 0.95 },
  ];

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: mapEntries,
        width: 5000,
        height: 5000,
      },
      appendedBy: systemUserId,
    },
    appendDeps,
  );

  console.log(`  World map updated with ${mapEntries.length} organisms`);

  // --- Mark seed as complete ---

  await container.db.insert(platformConfig).values({
    key: DEV_SEED_KEY,
    value: new Date().toISOString(),
  });

  console.log('Dev seed complete.');
  console.log('');
  console.log('  Login: dev@omnilith.local / dev');
  console.log('  Or use session token: dev-session-00000000');
  console.log('');
}
