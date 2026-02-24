/**
 * InMemorySurfaceRepository — derives surfaced organism IDs from map states.
 *
 * Treats every `spatial-map` organism as a surfaced anchor and includes all
 * `entries[].organismId` values from each current map state.
 */

import type { OrganismId } from '../identity.js';
import type { OrganismState } from '../organism/organism-state.js';
import type { SurfaceRepository } from '../visibility/surface-repository.js';
import type { InMemoryStateRepository } from './in-memory-state-repository.js';

function readMapEntries(state: OrganismState): ReadonlyArray<OrganismId> {
  if (state.contentTypeId !== 'spatial-map') return [];
  if (!state.payload || typeof state.payload !== 'object') return [];

  const payload = state.payload as { readonly entries?: unknown };
  if (!Array.isArray(payload.entries)) return [];

  const surfaced: OrganismId[] = [];
  for (const candidate of payload.entries) {
    if (!candidate || typeof candidate !== 'object') continue;
    const organismId = (candidate as { readonly organismId?: unknown }).organismId;
    if (typeof organismId === 'string' && organismId.length > 0) {
      surfaced.push(organismId as OrganismId);
    }
  }
  return surfaced;
}

export class InMemorySurfaceRepository implements SurfaceRepository {
  constructor(private readonly stateRepository: InMemoryStateRepository) {}

  async isSurfaced(organismId: OrganismId): Promise<boolean> {
    const surfaced = await this.listSurfacedOrganismIds();
    return surfaced.has(organismId);
  }

  async listSurfacedOrganismIds(): Promise<ReadonlySet<OrganismId>> {
    const surfaced = new Set<OrganismId>();
    const currentStates = this.stateRepository.findCurrentStates();

    for (const state of currentStates) {
      if (state.contentTypeId !== 'spatial-map') continue;
      surfaced.add(state.organismId);
      for (const organismId of readMapEntries(state)) {
        surfaced.add(organismId);
      }
    }

    return surfaced;
  }
}
