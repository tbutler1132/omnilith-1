/**
 * useIsSurfaced — checks whether an organism appears on the current map.
 *
 * Loads the current map's spatial-map state and checks if the given
 * organism ID appears in the entries array.
 */

import { usePlatform } from '../platform/PlatformContext.js';
import { useOrganism } from './use-organism.js';

export function useIsSurfaced(organismId: string): { surfaced: boolean; loading: boolean } {
  const { state } = usePlatform();
  const { data, loading } = useOrganism(state.currentMapId);

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
