/**
 * Spatial map hook for web-next.
 *
 * Loads the world map state and extracts only the dimensions needed for the
 * plain map slice. Entries remain intentionally unused for now.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../api/api-client.js';

interface OrganismState {
  readonly payload: unknown;
}

interface FetchOrganismResponse {
  readonly currentState: OrganismState | null;
}

interface SpatialMapState {
  readonly width: number;
  readonly height: number;
  readonly entryCount: number;
  readonly loading: boolean;
  readonly error: string | null;
}

function hasSession(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem('sessionId'));
}

function readPath(path: string): string {
  return hasSession() ? path : `/public${path}`;
}

function parseSpatialMapPayload(payload: unknown): { width: number; height: number; entryCount: number } {
  if (!payload || typeof payload !== 'object') {
    return { width: 5000, height: 5000, entryCount: 0 };
  }

  const typed = payload as Record<string, unknown>;

  const width = typeof typed.width === 'number' ? typed.width : 5000;
  const height = typeof typed.height === 'number' ? typed.height : 5000;
  const entryCount = Array.isArray(typed.entries) ? typed.entries.length : 0;

  return { width, height, entryCount };
}

export function useSpatialMap(mapId: string): SpatialMapState {
  const [state, setState] = useState<SpatialMapState>({
    width: 5000,
    height: 5000,
    entryCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    apiFetch<FetchOrganismResponse>(readPath(`/organisms/${mapId}`))
      .then((response) => {
        if (cancelled) return;

        const parsed = parseSpatialMapPayload(response.currentState?.payload);
        setState({
          width: parsed.width,
          height: parsed.height,
          entryCount: parsed.entryCount,
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
