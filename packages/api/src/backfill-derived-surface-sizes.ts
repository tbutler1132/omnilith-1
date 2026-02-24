/**
 * Backfill derived surface sizes on the world map.
 *
 * Recomputes `spatial-map.entries[].size` with canonical derivation logic.
 * Supports dry-run by default and append-state apply mode.
 */

import type { ContentTypeId, OrganismId } from '@omnilith/kernel';
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
const SIZE_EPSILON = 1e-6;

interface RunOptions {
  readonly apply: boolean;
  readonly worldMapId?: OrganismId;
}

function parseArgs(argv: string[]): RunOptions {
  const apply = argv.includes('--apply');

  const worldMapArg = argv.find((value) => value.startsWith('--world-map-id='));
  const worldMapId = worldMapArg?.slice('--world-map-id='.length);

  return {
    apply,
    worldMapId: worldMapId && worldMapId.length > 0 ? (worldMapId as OrganismId) : undefined,
  };
}

function differs(a: number | undefined, b: number): boolean {
  if (a === undefined) return true;
  return Math.abs(a - b) > SIZE_EPSILON;
}

async function resolveWorldMapId(
  options: RunOptions,
  db: ReturnType<typeof drizzle<typeof schema>>,
): Promise<OrganismId> {
  if (options.worldMapId) return options.worldMapId;

  const rows = await db.select().from(platformConfig).where(eq(platformConfig.key, WORLD_MAP_KEY)).limit(1);
  if (rows.length === 0) {
    throw new Error(`Missing platform config key: ${WORLD_MAP_KEY}`);
  }

  return rows[0].value as OrganismId;
}

function summarize(changed: ReadonlyArray<{ organismId: OrganismId; from?: number; to: number }>): string {
  if (changed.length === 0) return 'No entry size updates required.';

  const deltas = changed.map((row) => Math.abs((row.from ?? 0) - row.to));
  const totalDelta = deltas.reduce((sum, value) => sum + value, 0);
  const maxDelta = Math.max(...deltas);
  const avgDelta = totalDelta / deltas.length;

  return `Changed ${changed.length} entries (avg delta ${avgDelta.toFixed(4)}, max delta ${maxDelta.toFixed(4)}).`;
}

function mergeEntryWithSize(entry: SpatialMapEntrySnapshot, size: number): SpatialMapEntrySnapshot {
  return {
    ...entry,
    size,
  };
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

    const mapPayload = parseSpatialMapPayload(worldMapState.payload);
    if (!mapPayload) {
      throw new Error(`World map ${worldMapId} has invalid spatial-map payload.`);
    }

    const changed: Array<{ organismId: OrganismId; from?: number; to: number }> = [];
    const nextEntries: SpatialMapEntrySnapshot[] = [];

    for (const entry of mapPayload.entries) {
      const derived = await deriveSurfaceEntrySize(
        { organismId: entry.organismId, mapOrganismId: worldMapId },
        {
          organismRepository: container.organismRepository,
          stateRepository: container.stateRepository,
          compositionRepository: container.compositionRepository,
          surfaceRepository: container.surfaceRepository,
        },
      );

      nextEntries.push(mergeEntryWithSize(entry, derived.size));
      if (differs(entry.size, derived.size)) {
        changed.push({
          organismId: entry.organismId,
          from: entry.size,
          to: derived.size,
        });
      }
    }

    console.log(`[surface-size-backfill] world map: ${worldMapId}`);
    console.log(`[surface-size-backfill] entries: ${mapPayload.entries.length}`);
    console.log(`[surface-size-backfill] ${summarize(changed)}`);

    if (changed.length === 0) {
      console.log('[surface-size-backfill] nothing to apply.');
      return;
    }

    if (!options.apply) {
      console.log('[surface-size-backfill] dry-run mode (default). Re-run with --apply to append updated state.');
      return;
    }

    const appendedBy = worldMapState.createdBy;
    const state = await appendState(
      {
        organismId: worldMapId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: nextEntries,
          width: mapPayload.width,
          height: mapPayload.height,
          minSeparation: mapPayload.minSeparation,
        },
        appendedBy,
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
      `[surface-size-backfill] appended state ${state.id} at sequence ${state.sequenceNumber} with ${changed.length} updated entries.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
