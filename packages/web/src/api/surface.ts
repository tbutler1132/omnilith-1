/**
 * surfaceOnWorldMap — places a newly thresholded organism onto the world map.
 *
 * Fetches the current spatial-map state, checks for duplicate entries,
 * appends the new entry, and calls appendState to persist it.
 */

import { appendState, fetchOrganism } from './organisms.js';

interface SpatialMapEntry {
  organismId: string;
  x: number;
  y: number;
}

export async function surfaceOnWorldMap(worldMapId: string, organismId: string, x: number, y: number): Promise<void> {
  const { currentState } = await fetchOrganism(worldMapId);

  const payload = (currentState?.payload ?? {}) as Record<string, unknown>;
  const existingEntries = Array.isArray(payload.entries) ? (payload.entries as SpatialMapEntry[]) : [];

  // Skip if already surfaced
  if (existingEntries.some((e) => e.organismId === organismId)) {
    return;
  }

  const updatedEntries = [...existingEntries, { organismId, x, y }];

  await appendState(worldMapId, 'spatial-map', {
    ...payload,
    entries: updatedEntries,
  });
}
