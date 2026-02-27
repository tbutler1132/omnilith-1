/**
 * World-map entry spread migration.
 *
 * Repositions current world-map entries onto a spaced grid so markers are
 * visually legible in Space after dense clustering periods.
 *
 * Default mode is dry-run. Pass --apply to append the spread state.
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
const DEFAULT_SPACING = 120;

interface SpreadOptions {
  readonly apply: boolean;
  readonly worldMapId?: OrganismId;
  readonly spacing: number;
}

function parseArgs(argv: ReadonlyArray<string>): SpreadOptions {
  const apply = argv.includes('--apply');
  const worldMapArg = argv.find((value) => value.startsWith('--world-map-id='));
  const spacingArg = argv.find((value) => value.startsWith('--spacing='));
  const parsedSpacing = spacingArg ? Number(spacingArg.slice('--spacing='.length)) : DEFAULT_SPACING;

  return {
    apply,
    worldMapId:
      worldMapArg && worldMapArg.slice('--world-map-id='.length).length > 0
        ? (worldMapArg.slice('--world-map-id='.length) as OrganismId)
        : undefined,
    spacing: Number.isFinite(parsedSpacing) && parsedSpacing > 0 ? Math.round(parsedSpacing) : DEFAULT_SPACING,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function resolveWorldMapId(
  options: SpreadOptions,
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

function spreadEntries(
  entries: ReadonlyArray<SpatialMapEntrySnapshot>,
  width: number,
  height: number,
  spacing: number,
): ReadonlyArray<SpatialMapEntrySnapshot> {
  if (entries.length === 0) {
    return entries;
  }

  const columns = Math.ceil(Math.sqrt(entries.length));
  const rows = Math.ceil(entries.length / columns);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  const originX = clamp(Math.round(centerX - ((columns - 1) * spacing) / 2), 0, Math.max(0, width - 1));
  const originY = clamp(Math.round(centerY - ((rows - 1) * spacing) / 2), 0, Math.max(0, height - 1));

  const sorted = [...entries].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.organismId.localeCompare(b.organismId);
  });

  return sorted.map((entry, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = clamp(originX + col * spacing, 0, Math.max(0, width - 1));
    const y = clamp(originY + row * spacing, 0, Math.max(0, height - 1));

    return {
      ...entry,
      x,
      y,
    };
  });
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

    const mapPayload = parseSpatialMapPayload(worldMapState.payload);
    if (!mapPayload) {
      throw new Error(`World map ${worldMapId} payload is invalid`);
    }

    const nextEntries = spreadEntries(mapPayload.entries, mapPayload.width, mapPayload.height, options.spacing);
    const movedCount = nextEntries.filter((entry, index) => {
      const current = mapPayload.entries[index];
      return !current || Math.round(current.x) !== entry.x || Math.round(current.y) !== entry.y;
    }).length;

    console.log(`[spread-world-map] world map: ${worldMapId}`);
    console.log(`[spread-world-map] entries: ${mapPayload.entries.length}`);
    console.log(`[spread-world-map] spacing: ${options.spacing}`);
    console.log(`[spread-world-map] moved entries: ${movedCount}`);

    if (movedCount === 0) {
      console.log('[spread-world-map] nothing to apply.');
      return;
    }

    if (!options.apply) {
      console.log('[spread-world-map] dry-run mode. Re-run with --apply to append spread state.');
      return;
    }

    const state = await appendState(
      {
        organismId: worldMapId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: nextEntries,
          width: mapPayload.width,
          height: mapPayload.height,
          minSeparation: mapPayload.minSeparation ?? 1,
        },
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

    console.log(`[spread-world-map] appended state ${state.id} at sequence ${state.sequenceNumber}.`);
  } finally {
    await sql.end();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[spread-world-map] failed: ${message}`);
  process.exitCode = 1;
});
