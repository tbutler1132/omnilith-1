/**
 * useIsSurfaced — checks whether an organism appears on the current map.
 *
 * Loads the current map's spatial-map state and checks if the given
 * organism ID appears in the entries array.
 */

import { usePlatformMapState } from '../platform/index.js';
import { useOrganism } from './use-organism.js';

export function useIsSurfaced(organismId: string): { surfaced: boolean; loading: boolean } {
  const { currentMapId } = usePlatformMapState();
  const { data, loading } = useOrganism(currentMapId);

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
