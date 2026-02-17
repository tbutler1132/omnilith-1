/**
 * surfaceOnWorldMap — places a newly thresholded organism onto the world map.
 *
 * Fetches the current spatial-map state, checks for duplicate entries,
 * appends the new entry, and calls appendState to persist it.
 *
 * Retries transient failures to tolerate concurrent writes that race on
 * sequence number allocation. Re-reads current map state between attempts
 * so the final write always merges with the latest entries.
 */

import { ApiError } from './client.js';
import { appendState, fetchOrganism } from './organisms.js';

interface SpatialMapEntry {
  organismId: string;
  x: number;
  y: number;
}

const MAX_SURFACE_ATTEMPTS = 5;

interface SpatialMapSnapshot {
  payload: Record<string, unknown>;
  entries: SpatialMapEntry[];
}

function parseSnapshot(rawPayload: unknown): SpatialMapSnapshot {
  const payload = rawPayload && typeof rawPayload === 'object' ? (rawPayload as Record<string, unknown>) : {};
  const entries = Array.isArray(payload.entries) ? (payload.entries as SpatialMapEntry[]) : [];
  return { payload, entries };
}

async function fetchSpatialMapSnapshot(worldMapId: string): Promise<SpatialMapSnapshot> {
  const { currentState } = await fetchOrganism(worldMapId);
  return parseSnapshot(currentState?.payload ?? {});
}

export async function surfaceOnWorldMap(worldMapId: string, organismId: string, x: number, y: number): Promise<void> {
  for (let attempt = 1; attempt <= MAX_SURFACE_ATTEMPTS; attempt += 1) {
    const { payload, entries } = await fetchSpatialMapSnapshot(worldMapId);

    // Skip if already surfaced
    if (entries.some((entry) => entry.organismId === organismId)) {
      return;
    }

    const updatedEntries = [...entries, { organismId, x, y }];

    try {
      await appendState(worldMapId, 'spatial-map', {
        ...payload,
        entries: updatedEntries,
      });
      return;
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Another writer may have surfaced this organism while we raced.
      const latest = await fetchSpatialMapSnapshot(worldMapId);
      if (latest.entries.some((entry) => entry.organismId === organismId)) {
        return;
      }

      if (attempt === MAX_SURFACE_ATTEMPTS) {
        throw new Error('Failed to surface organism after concurrent updates. Please retry.');
      }
    }
  }
}
