/**
 * Unit-grid migration for world-map surfacing semantics.
 *
 * Normalizes world-map entries to one-unit occupancy, integer coordinates,
 * and removes surfaced community entries.
 *
 * Default mode is dry-run. Pass --apply to append the migrated state.
 */

import type { ContentTypeId, OrganismId } from '@omnilith/kernel';
import { appendState } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createContainer } from './container.js';
import * as schema from './db/schema.js';
import { platformConfig } from './db/schema.js';
import { parseSpatialMapPayload, type SpatialMapEntrySnapshot } from './surface/spatial-map-payload.js';

const WORLD_MAP_KEY = 'world_map_id';
const TARGET_WORLD_MAP_WIDTH = 5_000;
const TARGET_WORLD_MAP_HEIGHT = 5_000;
const TARGET_MIN_SEPARATION = 1;
const TARGET_ENTRY_SIZE = 1;

interface MigrationOptions {
  readonly apply: boolean;
  readonly worldMapId?: OrganismId;
}

interface EntryChange {
  readonly organismId: OrganismId;
  readonly reason: string;
}

function parseArgs(argv: ReadonlyArray<string>): MigrationOptions {
  const apply = argv.includes('--apply');
  const worldMapArg = argv.find((value) => value.startsWith('--world-map-id='));

  return {
    apply,
    worldMapId:
      worldMapArg && worldMapArg.slice('--world-map-id='.length).length > 0
        ? (worldMapArg.slice('--world-map-id='.length) as OrganismId)
        : undefined,
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value);
}

function differs(a: number | undefined, b: number): boolean {
  if (a === undefined) return true;
  return Math.abs(a - b) > Number.EPSILON;
}

async function resolveWorldMapId(
  options: MigrationOptions,
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

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const container = createContainer(db);
    const worldMapId = await resolveWorldMapId(options, db);

    const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
    if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
      throw new Error(`World map ${worldMapId} is missing a spatial-map current state`);
    }

    const worldMapPayload = parseSpatialMapPayload(worldMapState.payload);
    if (!worldMapPayload) {
      throw new Error(`World map ${worldMapId} payload is invalid`);
    }

    const changedEntries: EntryChange[] = [];
    const nextEntries: SpatialMapEntrySnapshot[] = [];

    for (const entry of worldMapPayload.entries) {
      const entryState = await container.stateRepository.findCurrentByOrganismId(entry.organismId);

      if (entryState?.contentTypeId === 'community') {
        changedEntries.push({
          organismId: entry.organismId,
          reason: 'removed-community-entry',
        });
        continue;
      }

      const nextX = roundCoordinate(entry.x);
      const nextY = roundCoordinate(entry.y);
      const sizeChanged = differs(entry.size, TARGET_ENTRY_SIZE);
      const moved = nextX !== entry.x || nextY !== entry.y;

      if (moved || sizeChanged) {
        changedEntries.push({
          organismId: entry.organismId,
          reason: [moved ? 'rounded-coordinate' : null, sizeChanged ? 'normalized-size' : null]
            .filter(Boolean)
            .join('+'),
        });
      }

      nextEntries.push({
        ...entry,
        x: nextX,
        y: nextY,
        size: TARGET_ENTRY_SIZE,
      });
    }

    const dimensionsChanged =
      worldMapPayload.width !== TARGET_WORLD_MAP_WIDTH || worldMapPayload.height !== TARGET_WORLD_MAP_HEIGHT;
    const minSeparationChanged = worldMapPayload.minSeparation !== TARGET_MIN_SEPARATION;
    const entryCountChanged = nextEntries.length !== worldMapPayload.entries.length;
    const changed = changedEntries.length > 0 || dimensionsChanged || minSeparationChanged || entryCountChanged;

    console.log(`[unit-grid-migration] world map: ${worldMapId}`);
    console.log(`[unit-grid-migration] entries before: ${worldMapPayload.entries.length}`);
    console.log(`[unit-grid-migration] entries after: ${nextEntries.length}`);
    console.log(`[unit-grid-migration] changed entries: ${changedEntries.length}`);
    console.log(`[unit-grid-migration] dimensions changed: ${dimensionsChanged}`);
    console.log(`[unit-grid-migration] minSeparation changed: ${minSeparationChanged}`);

    if (!changed) {
      console.log('[unit-grid-migration] nothing to apply.');
      return;
    }

    if (!options.apply) {
      console.log('[unit-grid-migration] dry-run mode. Re-run with --apply to append migrated state.');
      return;
    }

    const nextPayload = {
      entries: nextEntries,
      width: TARGET_WORLD_MAP_WIDTH,
      height: TARGET_WORLD_MAP_HEIGHT,
      minSeparation: TARGET_MIN_SEPARATION,
    };

    const state = await appendState(
      {
        organismId: worldMapId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: nextPayload,
        appendedBy: worldMapState.createdBy,
      },
      {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        surfaceRepository: container.surfaceRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    console.log(
      `[unit-grid-migration] appended state ${state.id} at sequence ${state.sequenceNumber} with ${changedEntries.length} changed entries.`,
    );
  } finally {
    await sql.end();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[unit-grid-migration] failed: ${message}`);
  process.exitCode = 1;
});
