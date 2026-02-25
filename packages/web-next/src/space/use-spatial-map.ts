/**
 * Spatial map hook for web-next.
 *
 * Loads the world map state and extracts dimensions plus valid map entries
 * so Space can render seeded organisms directly on the grid.
 */

import type { FetchOrganismResponse } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../api/api-client.js';
import { resolvePublicApiPath } from '../api/public-api-path.js';

export interface SpatialMapEntry {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly emphasis?: number;
}

interface SpatialMapState {
  readonly width: number;
  readonly height: number;
  readonly entries: ReadonlyArray<SpatialMapEntry>;
  readonly entryCount: number;
  readonly loading: boolean;
  readonly error: string | null;
}

function parseEntries(payload: unknown): ReadonlyArray<SpatialMapEntry> {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter((candidate): candidate is SpatialMapEntry => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    const entry = candidate as Record<string, unknown>;
    const hasRequiredFields =
      typeof entry.organismId === 'string' && typeof entry.x === 'number' && typeof entry.y === 'number';
    if (!hasRequiredFields) {
      return false;
    }

    if (entry.size !== undefined && typeof entry.size !== 'number') {
      return false;
    }

    if (entry.emphasis !== undefined && typeof entry.emphasis !== 'number') {
      return false;
    }

    return true;
  });
}

export function parseSpatialMapPayload(payload: unknown): {
  width: number;
  height: number;
  entries: ReadonlyArray<SpatialMapEntry>;
} {
  if (!payload || typeof payload !== 'object') {
    return { width: 5000, height: 5000, entries: [] };
  }

  const typed = payload as Record<string, unknown>;

  const width = typeof typed.width === 'number' ? typed.width : 5000;
  const height = typeof typed.height === 'number' ? typed.height : 5000;
  const entries = parseEntries(typed.entries);

  return { width, height, entries };
}

export function useSpatialMap(mapId: string): SpatialMapState {
  const [state, setState] = useState<SpatialMapState>({
    width: 5000,
    height: 5000,
    entries: [],
    entryCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${mapId}`))
      .then((response) => {
        if (cancelled) return;

        const parsed = parseSpatialMapPayload(response.currentState?.payload);
        setState({
          width: parsed.width,
          height: parsed.height,
          entries: parsed.entries,
          entryCount: parsed.entries.length,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;

        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load map state',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  return state;
}
