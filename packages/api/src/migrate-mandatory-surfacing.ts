/**
 * Mandatory surfacing backfill for Phase 1.
 *
 * Ensures every organism has surfaced presence on the world map by adding
 * entries for currently unsurfaced organisms. Default mode is dry-run.
 *
 * Usage:
 * - dry-run: `pnpm --filter @omnilith/api tsx src/migrate-mandatory-surfacing.ts`
 * - apply:   `pnpm --filter @omnilith/api tsx src/migrate-mandatory-surfacing.ts --apply`
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createContainer } from './container.js';
import * as schema from './db/schema.js';
import { organisms, platformConfig } from './db/schema.js';
import { deriveSurfaceEntrySize } from './surface/derive-surface-entry-size.js';
import { resolveThresholdSurfacePlacement } from './surface/resolve-threshold-surface-placement.js';
import { parseSpatialMapPayload, type SpatialMapEntrySnapshot } from './surface/spatial-map-payload.js';

const WORLD_MAP_KEY = 'world_map_id';

interface MigrationOptions {
  readonly apply: boolean;
  readonly worldMapId?: OrganismId;
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

async function resolveWorldMapId(
  db: ReturnType<typeof drizzle<typeof schema>>,
  options: MigrationOptions,
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
    const worldMapId = await resolveWorldMapId(db, options);
    const worldMapState = await container.stateRepository.findCurrentByOrganismId(worldMapId);
    if (!worldMapState || worldMapState.contentTypeId !== ('spatial-map' as ContentTypeId)) {
      throw new Error(`World map ${worldMapId} is missing a spatial-map current state`);
    }

    const worldMapPayload = parseSpatialMapPayload(worldMapState.payload);
    if (!worldMapPayload) {
      throw new Error(`World map ${worldMapId} payload is invalid`);
    }

    const surfacedIds = await container.surfaceRepository.listSurfacedOrganismIds();
    const allOrganisms = await db.select({ id: organisms.id, createdBy: organisms.createdBy }).from(organisms);

    const unsurfaced = allOrganisms.filter((row) => {
      const organismId = row.id as OrganismId;
      if (organismId === worldMapId) return false;
      return !surfacedIds.has(organismId);
    });

    console.log(`[mandatory-surfacing] world map: ${worldMapId}`);
    console.log(`[mandatory-surfacing] total organisms: ${allOrganisms.length}`);
    console.log(`[mandatory-surfacing] unsurfaced organisms: ${unsurfaced.length}`);

    if (unsurfaced.length === 0) {
      console.log('[mandatory-surfacing] nothing to do.');
      return;
    }

    let nextEntries: SpatialMapEntrySnapshot[] = [...worldMapPayload.entries];

    for (const row of unsurfaced) {
      const stewardId = row.createdBy as UserId;
      const stewardEntries = await Promise.all(
        nextEntries.map(async (entry) => {
          const organism = await container.organismRepository.findById(entry.organismId);
          if (!organism || organism.createdBy !== stewardId) {
            return null;
          }

          return {
            x: Math.round(entry.x),
            y: Math.round(entry.y),
          };
        }),
      );

      const placement = resolveThresholdSurfacePlacement({
        mapPayload: {
          entries: nextEntries,
          width: worldMapPayload.width,
          height: worldMapPayload.height,
          minSeparation: worldMapPayload.minSeparation,
        },
        stewardEntries: stewardEntries.filter(
          (value): value is { readonly x: number; readonly y: number } => value !== null,
        ),
      });

      const derived = await deriveSurfaceEntrySize(
        {
          organismId: row.id as OrganismId,
          mapOrganismId: worldMapId,
        },
        {
          organismRepository: container.organismRepository,
          stateRepository: container.stateRepository,
          compositionRepository: container.compositionRepository,
          surfaceRepository: container.surfaceRepository,
        },
      );

      nextEntries = [
        ...nextEntries,
        {
          organismId: row.id as OrganismId,
          x: placement.x,
          y: placement.y,
          size: derived.size,
        },
      ];
    }

    if (!options.apply) {
      console.log('[mandatory-surfacing] dry-run mode. Re-run with --apply to append world-map state.');
      return;
    }

    const appended = await appendState(
      {
        organismId: worldMapId,
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: {
          entries: nextEntries,
          width: worldMapPayload.width,
          height: worldMapPayload.height,
          minSeparation: worldMapPayload.minSeparation ?? 1,
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

    console.log(
      `[mandatory-surfacing] appended world-map state ${appended.id} at sequence ${appended.sequenceNumber}.`,
    );
  } finally {
    await sql.end();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mandatory-surfacing] failed: ${message}`);
  process.exitCode = 1;
});
