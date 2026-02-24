/**
 * World-map-only seed profile.
 *
 * Leaves local development data intentionally minimal: bootstrap world map
 * plus a single initial community organism from the v1 demo seed.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig, users } from './db/schema.js';
import { deriveSurfaceEntrySize } from './surface/derive-surface-entry-size.js';
import { parseSpatialMapPayload, type SpatialMapEntrySnapshot } from './surface/spatial-map-payload.js';

const WORLD_MAP_ONLY_SEED_KEY = 'world_map_only_seed_complete';
const WORLD_MAP_KEY = 'world_map_id';
const SYSTEM_USER_ID = 'system' as UserId;
const DEV_USER_EMAIL = 'dev@omnilith.local';
const DEV_USER_PASSWORD = 'dev';
const SIZE_EPSILON = 1e-6;
const WORLD_MAP_SIZE_STABILIZATION_MAX_PASSES = 6;

type CreateOrganismDeps = Parameters<typeof createOrganism>[1];
type ComposeOrganismDeps = Parameters<typeof composeOrganism>[1];

interface ManualCadenceMarkdownTemplates {
  readonly trajectory: string;
  readonly variables: string;
  readonly models: string;
  readonly retros: string;
  readonly tasks: string;
  readonly inbox: string;
}

interface ManualCadenceChildren {
  readonly trajectoryOrganismId: OrganismId;
  readonly variablesOrganismId: OrganismId;
  readonly modelsOrganismId: OrganismId;
  readonly retrosOrganismId: OrganismId;
  readonly tasksOrganismId: OrganismId;
  readonly inboxOrganismId: OrganismId;
}

function sizeDiffers(current: number | undefined, next: number): boolean {
  if (current === undefined) return true;
  return Math.abs(current - next) > SIZE_EPSILON;
}

function withUpdatedEntrySize(
  entries: ReadonlyArray<SpatialMapEntrySnapshot>,
  organismId: OrganismId,
  size: number,
): ReadonlyArray<SpatialMapEntrySnapshot> {
  return entries.map((entry) => (entry.organismId === organismId ? { ...entry, size } : entry));
}

function buildVariableRowsForBoundary(boundarySlug: string): ReadonlyArray<string> {
  switch (boundarySlug) {
    case 'capital-community':
      return [
        '| governance-load | Keep weekly tending capacity stable | 0 | 0-12 open proposals | Weekly | Run triage and integrate or decline backlog before accepting more work |',
        '| participation-rhythm | Keep contribution cadence alive | 0 | 6-20 weekly state changes | Weekly | Open participation invitation in community forum and lower non-essential work |',
        '| integration-latency | Avoid stale proposals and decision drag | 0 days | 0-7 days median age | Weekly | Prioritize oldest pending proposals and publish decision rationale |',
      ];
    default:
      return [
        '| workload | Protect tending capacity | 0 | 0-3 | Weekly | Open triage tasks and rebalance commitments |',
      ];
  }
}

function buildManualCadenceMarkdownTemplates(
  boundaryName: string,
  boundarySlug: string,
): ManualCadenceMarkdownTemplates {
  const variableRows = buildVariableRowsForBoundary(boundarySlug);

  return {
    trajectory: [
      `# ${boundaryName} Trajectory`,
      '',
      'Where this boundary is heading. Update when direction shifts, not on a fixed cadence.',
      '',
      '## Direction',
      '- What is this boundary trying to become over the next horizon?',
      '',
      '## Key dates',
      '- YYYY-MM-DD —',
      '',
      '## Commitments',
      '- What commitments are active right now?',
      '',
      '## What we are not doing right now',
      '- Explicitly list scope not being pursued.',
      '',
      '## Revision signal',
      '- What evidence means this trajectory needs to change?',
    ].join('\n'),
    variables: [
      `# ${boundaryName} Variables`,
      '',
      'Use this register to track what this boundary is trying to regulate.',
      '',
      '## Variable register',
      '| Variable | Why it matters | Current signal | Target range | Check cadence | If drift then |',
      '| --- | --- | --- | --- | --- | --- |',
      ...variableRows,
      '',
      '## Weekly tending check',
      '- Review sensor readings and open proposals.',
      '- Update current signals and target ranges when needed.',
      '- Link follow-up tasks before ending the weekly check.',
    ].join('\n'),
    models: [
      `# ${boundaryName} Models`,
      '',
      'Working assumptions that guide tending. Revise when reality disproves.',
      '',
      '## Status levels',
      '| Status | Meaning |',
      '| --- | --- |',
      '| assumption | Untested belief to act on now. |',
      '| emerging | Showing evidence through repeated tending cycles. |',
      '| learned | Repeatedly confirmed, still revisable. |',
      '',
      '## Model:',
      '### Status: assumption',
      '- Evidence from:',
      '- What this model predicts:',
      '- What actions it suggests:',
      '',
      '**Revision signal:**',
      '- What observation would update or replace this model?',
    ].join('\n'),
    retros: [
      `# ${boundaryName} Retros`,
      '',
      'Use episode cadence: one section per tending cycle.',
      '',
      '## Episode YYYY-WW (Week of YYYY-MM-DD)',
      '### Intentions',
      '- What did we intend to do this cycle?',
      '',
      '### Log',
      '- What happened?',
      '',
      '### Retro',
      '- What worked?',
      '- Where did tending feel heavy?',
      '- What changed in variables?',
      '',
      '### Adjustments',
      '- What will change next cycle?',
    ].join('\n'),
    tasks: [
      `# ${boundaryName} Tasks`,
      '',
      'Capture next actions needed to tend this boundary.',
      '',
      '## Now',
      '- [ ]',
      '',
      '## Next',
      '- [ ]',
      '',
      '## Later',
      '- [ ]',
      '',
      '## Done this week',
      '- [ ]',
    ].join('\n'),
    inbox: [
      `# ${boundaryName} Inbox`,
      '',
      'Capture fast. Triage later.',
      '',
      '## Untriaged notes',
      '- YYYY-MM-DD —',
      '',
      '## Triage moves',
      '- Move actions to Tasks.',
      '- Move regulation signals to Variables.',
      '- Move weekly reflections to Retros.',
      '- Move direction shifts to Trajectory.',
      '- Move assumptions to Models.',
    ].join('\n'),
  };
}

async function createManualCadenceChildren(
  boundaryName: string,
  boundarySlug: string,
  createdBy: UserId,
  createDeps: CreateOrganismDeps,
): Promise<ManualCadenceChildren> {
  const templates = buildManualCadenceMarkdownTemplates(boundaryName, boundarySlug);

  const trajectory = await createOrganism(
    {
      name: `${boundarySlug}-trajectory`,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: templates.trajectory,
        format: 'markdown',
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  const variables = await createOrganism(
    {
      name: `${boundarySlug}-variables`,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: templates.variables,
        format: 'markdown',
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  const models = await createOrganism(
    {
      name: `${boundarySlug}-models`,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: templates.models,
        format: 'markdown',
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  const retros = await createOrganism(
    {
      name: `${boundarySlug}-retros`,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: templates.retros,
        format: 'markdown',
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  const tasks = await createOrganism(
    {
      name: `${boundarySlug}-tasks`,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: templates.tasks,
        format: 'markdown',
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  const inbox = await createOrganism(
    {
      name: `${boundarySlug}-inbox`,
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: templates.inbox,
        format: 'markdown',
      },
      createdBy,
      openTrunk: true,
    },
    createDeps,
  );

  return {
    trajectoryOrganismId: trajectory.organism.id,
    variablesOrganismId: variables.organism.id,
    modelsOrganismId: models.organism.id,
    retrosOrganismId: retros.organism.id,
    tasksOrganismId: tasks.organism.id,
    inboxOrganismId: inbox.organism.id,
  };
}

async function composeManualCadenceChildren(
  parentId: OrganismId,
  children: ManualCadenceChildren,
  composedBy: UserId,
  composeDeps: ComposeOrganismDeps,
): Promise<void> {
  await composeOrganism({ parentId, childId: children.trajectoryOrganismId, composedBy }, composeDeps);
  await composeOrganism({ parentId, childId: children.variablesOrganismId, composedBy }, composeDeps);
  await composeOrganism({ parentId, childId: children.modelsOrganismId, composedBy }, composeDeps);
  await composeOrganism({ parentId, childId: children.retrosOrganismId, composedBy }, composeDeps);
  await composeOrganism({ parentId, childId: children.tasksOrganismId, composedBy }, composeDeps);
  await composeOrganism({ parentId, childId: children.inboxOrganismId, composedBy }, composeDeps);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
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

export async function seedWorldMapOnly(container: Container): Promise<void> {
  const devUserId = await ensureDevUser(container);

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

  const deriveSurfaceSizeDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    compositionRepository: container.compositionRepository,
    surfaceRepository: container.surfaceRepository,
  };

  const devPersonalOrganism = await createOrganism(
    {
      name: 'Dev Practice',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Dev Practice',
          '',
          'Personal organism seeded for local development.',
          '',
          '- Private by default',
          '- Surface intentionally when ready',
        ].join('\n'),
        format: 'markdown',
        metadata: { isPersonalOrganism: true },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  await container.visibilityRepository.save({
    organismId: devPersonalOrganism.organism.id,
    level: 'private',
    updatedAt: container.identityGenerator.timestamp(),
  });

  const devPersonalManualCadenceChildren = await createManualCadenceChildren(
    'Dev Practice',
    'dev-practice',
    devUserId,
    createDeps,
  );

  await composeManualCadenceChildren(
    devPersonalOrganism.organism.id,
    devPersonalManualCadenceChildren,
    devUserId,
    composeDeps,
  );

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

  const capitalCommunityManualCadenceChildren = await createManualCadenceChildren(
    'Capital Community',
    'capital-community',
    SYSTEM_USER_ID,
    createDeps,
  );

  const capitalFieldNoteContent = [
    '# Capital Field Note',
    '',
    'This is a simple text organism surfaced on the world map for web-next slice testing.',
    '',
    '- Enter from Space',
    '- Confirm non-map content type rendering',
  ].join('\n');

  const capitalFieldNote = await createOrganism(
    {
      name: 'Capital Field Note',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: capitalFieldNoteContent,
        format: 'markdown',
      },
      createdBy: SYSTEM_USER_ID,
      openTrunk: true,
    },
    createDeps,
  );

  const capitalCommunityMapFieldNote = await createOrganism(
    {
      name: 'Capital Community Field Note',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: capitalFieldNoteContent,
        format: 'markdown',
      },
      createdBy: SYSTEM_USER_ID,
      openTrunk: true,
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

  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: capitalFieldNote.organism.id,
      composedBy: SYSTEM_USER_ID,
    },
    composeDeps,
  );

  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: capitalCommunityMapFieldNote.organism.id,
      composedBy: SYSTEM_USER_ID,
    },
    composeDeps,
  );

  const capitalCommunityMapFieldNoteSize = await deriveSurfaceEntrySize(
    {
      organismId: capitalFieldNote.organism.id,
      mapOrganismId: capitalMap.organism.id,
    },
    deriveSurfaceSizeDeps,
  );

  await appendState(
    {
      organismId: capitalMap.organism.id,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [
          {
            organismId: capitalCommunityMapFieldNote.organism.id,
            x: 1060,
            y: 980,
            size: capitalCommunityMapFieldNoteSize.size,
            emphasis: 0.68,
          },
        ],
        width: 2000,
        height: 2000,
      },
      appendedBy: SYSTEM_USER_ID,
    },
    appendDeps,
  );

  await composeManualCadenceChildren(
    capitalCommunity.organism.id,
    capitalCommunityManualCadenceChildren,
    SYSTEM_USER_ID,
    composeDeps,
  );

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [
          { organismId: capitalCommunity.organism.id, x: 2650, y: 2910, size: 1.35, emphasis: 0.9 },
          { organismId: capitalFieldNote.organism.id, x: 2850, y: 2850, size: 1.1, emphasis: 0.72 },
        ],
        width: 5000,
        height: 5000,
      },
      appendedBy: SYSTEM_USER_ID,
    },
    appendDeps,
  );

  for (let pass = 0; pass < WORLD_MAP_SIZE_STABILIZATION_MAX_PASSES; pass += 1) {
    const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
    if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
      break;
    }

    const worldMapPayload = parseSpatialMapPayload(worldMapState.payload);
    if (!worldMapPayload) {
      break;
    }

    const communityEntry = worldMapPayload.entries.find((entry) => entry.organismId === capitalCommunity.organism.id);
    const fieldNoteEntry = worldMapPayload.entries.find((entry) => entry.organismId === capitalFieldNote.organism.id);
    if (!communityEntry || !fieldNoteEntry) {
      break;
    }

    const nextCommunitySize = await deriveSurfaceEntrySize(
      {
        organismId: capitalCommunity.organism.id,
        mapOrganismId: worldMapId,
      },
      deriveSurfaceSizeDeps,
    );
    const nextFieldNoteSize = await deriveSurfaceEntrySize(
      {
        organismId: capitalFieldNote.organism.id,
        mapOrganismId: worldMapId,
      },
      deriveSurfaceSizeDeps,
    );

    const communityChanged = sizeDiffers(communityEntry.size, nextCommunitySize.size);
    const fieldNoteChanged = sizeDiffers(fieldNoteEntry.size, nextFieldNoteSize.size);
    if (!communityChanged && !fieldNoteChanged) {
      break;
    }

    let nextEntries = worldMapPayload.entries;
    if (communityChanged) {
      nextEntries = withUpdatedEntrySize(nextEntries, capitalCommunity.organism.id, nextCommunitySize.size);
    }
    if (fieldNoteChanged) {
      nextEntries = withUpdatedEntrySize(nextEntries, capitalFieldNote.organism.id, nextFieldNoteSize.size);
    }

    await appendState(
      {
        organismId: worldMapId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: nextEntries,
          width: worldMapPayload.width,
          height: worldMapPayload.height,
          ...(worldMapPayload.minSeparation !== undefined ? { minSeparation: worldMapPayload.minSeparation } : {}),
        },
        appendedBy: SYSTEM_USER_ID,
      },
      appendDeps,
    );
  }

  await container.db.insert(platformConfig).values({
    key: WORLD_MAP_ONLY_SEED_KEY,
    value: new Date().toISOString(),
  });

  console.log(
    `Using OMNILITH_SEED_PROFILE=world-map-only with Capital Community (${capitalCommunity.organism.id}), Capital Field Note (${capitalFieldNote.organism.id}), Capital Community Field Note (${capitalCommunityMapFieldNote.organism.id}), and Dev Practice (${devPersonalOrganism.organism.id})`,
  );
}
