/**
 * useIsSurfaced — checks whether an organism appears on a map.
 *
 * Loads the map's spatial-map state and checks if the given organism ID
 * appears in the entries array.
 */

import { useOrganism } from './use-organism.js';

export function useIsSurfaced(mapId: string, organismId: string): { surfaced: boolean; loading: boolean } {
  const { data, loading } = useOrganism(mapId);

  if (loading || !data?.currentState) {
    return { surfaced: false, loading };
  }

  const payload = data.currentState.payload as Record<string, unknown> | null;
  if (!payload || !Array.isArray(payload.entries)) {
    return { surfaced: false, loading: false };
  }

  const entries = payload.entries as Array<{ organismId?: string }>;
  const surfaced = entries.some((e) => e.organismId === organismId);

  return { surfaced, loading: false };
}
