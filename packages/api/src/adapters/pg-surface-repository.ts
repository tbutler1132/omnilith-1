/**
 * PostgreSQL implementation of SurfaceRepository.
 *
 * Surfaced organisms are resolved from current `spatial-map` states:
 * every map organism itself is a surfaced anchor, plus all entry IDs.
 */

import type { OrganismId, SurfaceRepository } from '@omnilith/kernel';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { organismStates } from '../db/schema.js';
import { parseSpatialMapPayload } from '../surface/spatial-map-payload.js';

interface SpatialMapStateRow {
  readonly organismId: string;
  readonly sequenceNumber: number;
  readonly payload: unknown;
}

export class PgSurfaceRepository implements SurfaceRepository {
  constructor(private readonly db: Database) {}

  async isSurfaced(organismId: OrganismId): Promise<boolean> {
    const surfaced = await this.listSurfacedOrganismIds();
    return surfaced.has(organismId);
  }

  async listSurfacedOrganismIds(): Promise<ReadonlySet<OrganismId>> {
    const rows = await this.db
      .select({
        organismId: organismStates.organismId,
        sequenceNumber: organismStates.sequenceNumber,
        payload: organismStates.payload,
      })
      .from(organismStates)
      .where(eq(organismStates.contentTypeId, 'spatial-map'))
      .orderBy(organismStates.organismId, desc(organismStates.sequenceNumber));

    const surfaced = new Set<OrganismId>();
    const currentByMap = this.pickCurrentMapStates(rows);

    for (const row of currentByMap.values()) {
      surfaced.add(row.organismId as OrganismId);
      const payload = parseSpatialMapPayload(row.payload);
      if (!payload) continue;
      for (const entry of payload.entries) {
        surfaced.add(entry.organismId);
      }
    }

    return surfaced;
  }

  private pickCurrentMapStates(rows: ReadonlyArray<SpatialMapStateRow>): Map<string, SpatialMapStateRow> {
    const currentByMap = new Map<string, SpatialMapStateRow>();
    for (const row of rows) {
      if (!currentByMap.has(row.organismId)) {
        currentByMap.set(row.organismId, row);
      }
    }
    return currentByMap;
  }
}
