/**
 * Map capacity migration for world-relative boundary scaling.
 *
 * Rescales selected community map dimensions and entry coordinates so each
 * community occupies a target share of world-map area (default: 1/30).
 * After migration, derived entry sizes are recomputed on migrated maps and
 * stabilized on the world map.
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createContainer } from './container.js';
import * as schema from './db/schema.js';
import { platformConfig } from './db/schema.js';
import { deriveSurfaceEntrySize } from './surface/derive-surface-entry-size.js';
import { parseSpatialMapPayload, type SpatialMapEntrySnapshot } from './surface/spatial-map-payload.js';

const WORLD_MAP_KEY = 'world_map_id';
const DEFAULT_TARGET_SHARE = 1 / 30;
const DEFAULT_WORLD_STABILIZATION_PASSES = 6;
const SIZE_EPSILON = 1e-6;
const COORD_EPSILON = 1e-6;

interface RunOptions {
  readonly apply: boolean;
  readonly worldMapId?: OrganismId;
  readonly targetShare: number;
  readonly communityIds: ReadonlyArray<OrganismId>;
  readonly worldStabilizationPasses: number;
}

interface CommunityMapRecord {
  readonly communityOrganismId: OrganismId;
  readonly communityName: string;
  readonly mapOrganismId: OrganismId;
}

interface CommunityMigrationSummary {
  readonly communityOrganismId: OrganismId;
  readonly communityName: string;
  readonly mapOrganismId: OrganismId;
  readonly fromWidth: number;
  readonly fromHeight: number;
  readonly toWidth: number;
  readonly toHeight: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly changedEntries: number;
  readonly changed: boolean;
}

interface WorldMapUpdateSummary {
  readonly changedEntries: number;
  readonly changed: boolean;
}

interface CommunityPayloadLike {
  readonly mapOrganismId?: string;
}

function parseArgs(argv: ReadonlyArray<string>): RunOptions {
  const apply = argv.includes('--apply');
  const worldMapArg = argv.find((value) => value.startsWith('--world-map-id='));
  const targetShareArg = argv.find((value) => value.startsWith('--target-share='));
  const worldStabilizationArg = argv.find((value) => value.startsWith('--world-stabilization-passes='));
  const explicitCommunityArgs = argv.filter((value) => value.startsWith('--community-id='));
  const commaDelimitedCommunityArg = argv.find((value) => value.startsWith('--community-ids='));

  const targetShareCandidate = targetShareArg ? Number(targetShareArg.slice('--target-share='.length)) : NaN;
  const worldStabilizationCandidate = worldStabilizationArg
    ? Number(worldStabilizationArg.slice('--world-stabilization-passes='.length))
    : NaN;

  const explicitCommunityIds = explicitCommunityArgs
    .map((value) => value.slice('--community-id='.length))
    .filter((value) => value.length > 0);
  const commaDelimitedCommunityIds = commaDelimitedCommunityArg
    ? commaDelimitedCommunityArg
        .slice('--community-ids='.length)
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  return {
    apply,
    worldMapId:
      worldMapArg && worldMapArg.slice('--world-map-id='.length).length > 0
        ? (worldMapArg.slice('--world-map-id='.length) as OrganismId)
        : undefined,
    targetShare:
      Number.isFinite(targetShareCandidate) && targetShareCandidate > 0 && targetShareCandidate < 1
        ? targetShareCandidate
        : DEFAULT_TARGET_SHARE,
    communityIds: Array.from(new Set([...explicitCommunityIds, ...commaDelimitedCommunityIds])).map(
      (id) => id as OrganismId,
    ),
    worldStabilizationPasses:
      Number.isFinite(worldStabilizationCandidate) && worldStabilizationCandidate > 0
        ? Math.floor(worldStabilizationCandidate)
        : DEFAULT_WORLD_STABILIZATION_PASSES,
  };
}

function parseCommunityPayload(payload: unknown): CommunityPayloadLike | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as CommunityPayloadLike;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sizeDiffers(current: number | undefined, next: number): boolean {
  if (current === undefined) return true;
  return Math.abs(current - next) > SIZE_EPSILON;
}

function coordinateDiffers(current: number, next: number): boolean {
  return Math.abs(current - next) > COORD_EPSILON;
}

async function resolveWorldMapId(
  options: RunOptions,
  db: ReturnType<typeof drizzle<typeof schema>>,
): Promise<OrganismId> {
  if (options.worldMapId) {
    return options.worldMapId;
  }

  const rows = await db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY)).limit(1);
  if (rows.length === 0) {
    throw new Error(`Missing platform config key: ${WORLD_MAP_KEY}`);
  }

  return rows[0].value as OrganismId;
}

async function resolveCommunityMapRecords(
  worldMapPayload: ReturnType<typeof parseSpatialMapPayload>,
  options: RunOptions,
  deps: ReturnType<typeof createContainer>,
): Promise<ReadonlyArray<CommunityMapRecord>> {
  const candidateIds =
    options.communityIds.length > 0
      ? options.communityIds
      : (worldMapPayload?.entries.map((entry) => entry.organismId) ?? []);

  const records: CommunityMapRecord[] = [];
  const seen = new Set<OrganismId>();

  for (const organismId of candidateIds) {
    if (seen.has(organismId)) {
      continue;
    }
    seen.add(organismId);

    const state = await deps.stateRepository.findCurrentByOrganismId(organismId);
    if (!state || state.contentTypeId !== ('community' as ContentTypeId)) {
      continue;
    }

    const payload = parseCommunityPayload(state.payload);
    const mapOrganismId = payload?.mapOrganismId;
    if (typeof mapOrganismId !== 'string' || mapOrganismId.length === 0) {
      continue;
    }

    const community = await deps.organismRepository.findById(organismId);
    records.push({
      communityOrganismId: organismId,
      communityName: community?.name ?? organismId,
      mapOrganismId: mapOrganismId as OrganismId,
    });
  }

  return records;
}

async function migrateCommunityMap(
  record: CommunityMapRecord,
  worldArea: number,
  options: RunOptions,
  deps: ReturnType<typeof createContainer>,
): Promise<CommunityMigrationSummary | null> {
  const mapState = await deps.stateRepository.findCurrentByOrganismId(record.mapOrganismId);
  if (!mapState || mapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
    return null;
  }

  const payload = parseSpatialMapPayload(mapState.payload);
  if (!payload) {
    return null;
  }

  const fromWidth = payload.width;
  const fromHeight = payload.height;
  const fromArea = Math.max(1, fromWidth * fromHeight);
  const targetArea = Math.max(1, worldArea * options.targetShare);
  const scale = Math.sqrt(targetArea / fromArea);
  const toWidth = Math.max(1, Math.round(fromWidth * scale));
  const toHeight = Math.max(1, Math.round(fromHeight * scale));
  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;

  let changedEntries = 0;
  const nextEntries: SpatialMapEntrySnapshot[] = [];
  const targetMapEntrySizes = new Map<OrganismId, number>();
  for (const entry of payload.entries) {
    targetMapEntrySizes.set(entry.organismId, entry.size ?? 1);
  }
  const targetMapOverride = {
    mapWidth: toWidth,
    mapHeight: toHeight,
    minSeparation: payload.minSeparation,
    entrySizes: targetMapEntrySizes,
  };

  for (const entry of payload.entries) {
    const nextX = roundCoordinate(clamp(entry.x * scaleX, 0, toWidth));
    const nextY = roundCoordinate(clamp(entry.y * scaleY, 0, toHeight));
    const derived = await deriveSurfaceEntrySize(
      {
        organismId: entry.organismId,
        mapOrganismId: record.mapOrganismId,
        curationScale: entry.curationScale,
        targetMapOverride,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        compositionRepository: deps.compositionRepository,
        surfaceRepository: deps.surfaceRepository,
      },
    );

    if (
      coordinateDiffers(entry.x, nextX) ||
      coordinateDiffers(entry.y, nextY) ||
      sizeDiffers(entry.size, derived.size)
    ) {
      changedEntries += 1;
    }

    nextEntries.push({
      ...entry,
      x: nextX,
      y: nextY,
      size: derived.size,
    });
  }

  const changed = fromWidth !== toWidth || fromHeight !== toHeight || changedEntries > 0;
  if (options.apply && changed) {
    await appendState(
      {
        organismId: record.mapOrganismId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: nextEntries,
          width: toWidth,
          height: toHeight,
          ...(payload.minSeparation !== undefined ? { minSeparation: payload.minSeparation } : {}),
        },
        appendedBy: mapState.createdBy as UserId,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        contentTypeRegistry: deps.contentTypeRegistry,
        eventPublisher: deps.eventPublisher,
        identityGenerator: deps.identityGenerator,
        visibilityRepository: deps.visibilityRepository,
        surfaceRepository: deps.surfaceRepository,
        relationshipRepository: deps.relationshipRepository,
        compositionRepository: deps.compositionRepository,
      },
    );
  }

  return {
    communityOrganismId: record.communityOrganismId,
    communityName: record.communityName,
    mapOrganismId: record.mapOrganismId,
    fromWidth,
    fromHeight,
    toWidth,
    toHeight,
    scaleX,
    scaleY,
    changedEntries,
    changed,
  };
}

async function stabilizeWorldMapEntries(
  worldMapId: OrganismId,
  options: RunOptions,
  deps: ReturnType<typeof createContainer>,
): Promise<ReadonlyArray<WorldMapUpdateSummary>> {
  const summaries: WorldMapUpdateSummary[] = [];

  for (let pass = 0; pass < options.worldStabilizationPasses; pass += 1) {
    const worldMapState = await deps.stateRepository.findCurrentByOrganismId(worldMapId);
    if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
      break;
    }

    const payload = parseSpatialMapPayload(worldMapState.payload);
    if (!payload) {
      break;
    }

    let changedEntries = 0;
    const nextEntries: SpatialMapEntrySnapshot[] = [];

    for (const entry of payload.entries) {
      const derived = await deriveSurfaceEntrySize(
        {
          organismId: entry.organismId,
          mapOrganismId: worldMapId,
          curationScale: entry.curationScale,
        },
        {
          organismRepository: deps.organismRepository,
          stateRepository: deps.stateRepository,
          compositionRepository: deps.compositionRepository,
          surfaceRepository: deps.surfaceRepository,
        },
      );

      if (sizeDiffers(entry.size, derived.size)) {
        changedEntries += 1;
      }

      nextEntries.push({
        ...entry,
        size: derived.size,
      });
    }

    const changed = changedEntries > 0;
    summaries.push({ changedEntries, changed });
    if (!changed) {
      break;
    }

    if (!options.apply) {
      break;
    }

    await appendState(
      {
        organismId: worldMapId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: nextEntries,
          width: payload.width,
          height: payload.height,
          ...(payload.minSeparation !== undefined ? { minSeparation: payload.minSeparation } : {}),
        },
        appendedBy: worldMapState.createdBy as UserId,
      },
      {
        organismRepository: deps.organismRepository,
        stateRepository: deps.stateRepository,
        contentTypeRegistry: deps.contentTypeRegistry,
        eventPublisher: deps.eventPublisher,
        identityGenerator: deps.identityGenerator,
        visibilityRepository: deps.visibilityRepository,
        surfaceRepository: deps.surfaceRepository,
        relationshipRepository: deps.relationshipRepository,
        compositionRepository: deps.compositionRepository,
      },
    );
  }

  return summaries;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith_dev';
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });
  const container = createContainer(db);

  try {
    const worldMapId = await resolveWorldMapId(options, db);
    const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
    if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
      throw new Error(`World map ${worldMapId} is missing or not a spatial-map organism.`);
    }

    const worldMapPayload = parseSpatialMapPayload(worldMapState.payload);
    if (!worldMapPayload) {
      throw new Error(`World map ${worldMapId} has invalid spatial-map payload.`);
    }

    const worldArea = Math.max(1, worldMapPayload.width * worldMapPayload.height);
    const records = await resolveCommunityMapRecords(worldMapPayload, options, container);

    console.log(`[map-capacity-migration] world map: ${worldMapId}`);
    console.log(`[map-capacity-migration] world dimensions: ${worldMapPayload.width}x${worldMapPayload.height}`);
    console.log(`[map-capacity-migration] target share: ${options.targetShare}`);
    console.log(`[map-capacity-migration] selected communities: ${records.length}`);

    const communitySummaries: CommunityMigrationSummary[] = [];
    for (const record of records) {
      const summary = await migrateCommunityMap(record, worldArea, options, container);
      if (!summary) {
        continue;
      }
      communitySummaries.push(summary);

      console.log(
        `[map-capacity-migration] ${summary.communityName} (${summary.communityOrganismId}) map ${summary.mapOrganismId}: ${summary.fromWidth}x${summary.fromHeight} -> ${summary.toWidth}x${summary.toHeight} | changedEntries=${summary.changedEntries} | changed=${summary.changed}`,
      );
    }

    const changedCommunityCount = communitySummaries.filter((summary) => summary.changed).length;
    console.log(
      `[map-capacity-migration] community maps changed: ${changedCommunityCount}/${communitySummaries.length}`,
    );

    const worldSummaries = await stabilizeWorldMapEntries(worldMapId, options, container);
    const worldChangedPasses = worldSummaries.filter((summary) => summary.changed).length;
    const totalWorldEntryChanges = worldSummaries.reduce((sum, summary) => sum + summary.changedEntries, 0);
    console.log(
      `[map-capacity-migration] world map stabilization passes=${worldSummaries.length}, changedPasses=${worldChangedPasses}, totalChangedEntries=${totalWorldEntryChanges}`,
    );

    if (!options.apply) {
      console.log('[map-capacity-migration] dry-run mode (default). Re-run with --apply to append migrated states.');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
