/**
 * Map Studio presenter.
 *
 * Normalizes map studio status, surfacing candidates, and placement intent so
 * rendering remains deterministic and write actions stay predictable.
 */

import type { FetchUserOrganismsResponse } from '@omnilith/api-contracts';
import { ApiError } from '../../../api/api-client.js';

export type MapStudioStatus = 'loading' | 'auth-required' | 'error' | 'unsupported-target' | 'empty' | 'ready';

export interface PresentMapStudioStatusInput {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hasMapOrganism: boolean;
  readonly isSpatialMapTarget: boolean;
  readonly requiresSignIn: boolean;
  readonly candidateCount: number;
}

export interface PresentMapStudioStatusResult {
  readonly status: MapStudioStatus;
  readonly message: string;
}

export interface MapStudioCandidate {
  readonly id: string;
  readonly name: string;
  readonly contentTypeId: string | null;
}

export interface PresentMapStudioCandidatesInput {
  readonly organisms: FetchUserOrganismsResponse['organisms'];
  readonly surfacedOrganismIds: ReadonlySet<string>;
  readonly excludedOrganismIds?: ReadonlySet<string>;
  readonly mapOrganismId: string | null;
}

export interface ResolveMapStudioPlacementInput {
  readonly cursorWorld: {
    readonly x: number;
    readonly y: number;
  } | null;
}

export interface MapStudioPlacement {
  readonly x: number;
  readonly y: number;
  readonly source: 'cursor';
}

function isAuthRequiredError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return error.status === 401 || error.status === 403;
}

export function presentMapStudioStatus(input: PresentMapStudioStatusInput): PresentMapStudioStatusResult {
  if (input.loading) {
    return {
      status: 'loading',
      message: 'Loading map studio...',
    };
  }

  if (isAuthRequiredError(input.error)) {
    return {
      status: 'auth-required',
      message: 'Log in to surface organisms with Map Studio.',
    };
  }

  if (input.error) {
    return {
      status: 'error',
      message: input.error.message ?? 'Failed to load map studio.',
    };
  }

  if (!input.hasMapOrganism) {
    return {
      status: 'empty',
      message: 'No map organism is available in the current boundary context.',
    };
  }

  if (!input.isSpatialMapTarget) {
    return {
      status: 'unsupported-target',
      message: 'Map Studio requires a spatial-map target organism.',
    };
  }

  if (input.requiresSignIn) {
    return {
      status: 'auth-required',
      message: 'Sign in to surface your organisms onto this map.',
    };
  }

  if (input.candidateCount === 0) {
    return {
      status: 'empty',
      message: 'No unsurfaced organisms are available for this map.',
    };
  }

  return {
    status: 'ready',
    message: '',
  };
}

export function presentMapStudioCandidates(input: PresentMapStudioCandidatesInput): ReadonlyArray<MapStudioCandidate> {
  const excluded = input.excludedOrganismIds ?? new Set<string>();

  return [...input.organisms]
    .filter((entry) => {
      const organismId = entry.organism.id;
      if (input.mapOrganismId && organismId === input.mapOrganismId) {
        return false;
      }

      if (input.surfacedOrganismIds.has(organismId)) {
        return false;
      }

      if (excluded.has(organismId)) {
        return false;
      }

      return true;
    })
    .map((entry) => ({
      id: entry.organism.id,
      name: entry.organism.name,
      contentTypeId: entry.currentState?.contentTypeId ?? null,
    }))
    .sort((a, b) => {
      const nameSort = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      if (nameSort !== 0) {
        return nameSort;
      }

      return a.id.localeCompare(b.id);
    });
}

export function resolveMapStudioPlacement(input: ResolveMapStudioPlacementInput): MapStudioPlacement | null {
  const cursor = input.cursorWorld;
  if (cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y)) {
    return {
      x: Math.round(cursor.x),
      y: Math.round(cursor.y),
      source: 'cursor',
    };
  }

  return null;
}
