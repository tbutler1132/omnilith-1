/**
 * useSpatialMap — loads and parses a spatial-map organism.
 *
 * Reuses useOrganism for fetching, then extracts the entries array
 * from the spatial-map payload. Filters to valid entries that have
 * the required organismId, x, and y fields.
 */

import { useOrganism } from '../hooks/use-organism.js';

export interface SpatialMapEntry {
  organismId: string;
  x: number;
  y: number;
  size?: number;
  emphasis?: number;
}

interface SpatialMapResult {
  entries: SpatialMapEntry[];
  width: number;
  height: number;
  loading: boolean;
  error: Error | undefined;
}

export function useSpatialMap(mapId: string, refreshKey = 0): SpatialMapResult {
  const { data, loading, error } = useOrganism(mapId, refreshKey);

  if (loading || error || !data?.currentState) {
    return { entries: [], width: 2000, height: 2000, loading, error };
  }

  const payload = data.currentState.payload as Record<string, unknown> | null;
  if (!payload || typeof payload !== 'object') {
    return { entries: [], width: 2000, height: 2000, loading: false, error: undefined };
  }

  const entries = parseEntries(payload.entries);
  const width = typeof payload.width === 'number' ? payload.width : 2000;
  const height = typeof payload.height === 'number' ? payload.height : 2000;

  return { entries, width, height, loading: false, error: undefined };
}

function parseEntries(raw: unknown): SpatialMapEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((e): e is SpatialMapEntry => {
    if (typeof e !== 'object' || e === null) return false;
    const entry = e as Record<string, unknown>;
    return typeof entry.organismId === 'string' && typeof entry.x === 'number' && typeof entry.y === 'number';
  });
}
