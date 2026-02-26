/**
 * Map Studio app route codec.
 *
 * Persists map targeting and candidate selection so surfacing workflow can be
 * resumed directly from the visor URL.
 */

export interface MapStudioAppRouteState {
  readonly targetedOrganismId: string | null;
  readonly selectedCandidateId: string | null;
}

const CANDIDATE_QUERY_KEY = 'mapStudioCandidate';

export function parseMapStudioAppRoute(searchParams: URLSearchParams): MapStudioAppRouteState {
  return {
    targetedOrganismId: normalizeValue(searchParams.get('organism')),
    selectedCandidateId: normalizeValue(searchParams.get(CANDIDATE_QUERY_KEY)),
  };
}

export function writeMapStudioAppRoute(
  searchParams: URLSearchParams,
  routeState: MapStudioAppRouteState,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  if (routeState.targetedOrganismId) {
    next.set('organism', routeState.targetedOrganismId);
  } else {
    next.delete('organism');
  }

  if (routeState.selectedCandidateId) {
    next.set(CANDIDATE_QUERY_KEY, routeState.selectedCandidateId);
  } else {
    next.delete(CANDIDATE_QUERY_KEY);
  }

  return next;
}

export function clearMapStudioAppRoute(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(CANDIDATE_QUERY_KEY);
  return next;
}

export function resolveMapStudioAppRouteState(
  routeState: unknown,
  fallbackOrganismId: string | null,
): MapStudioAppRouteState {
  const normalized = normalizeRouteState(routeState);

  return {
    targetedOrganismId: normalized.targetedOrganismId ?? fallbackOrganismId,
    selectedCandidateId: normalized.selectedCandidateId,
  };
}

function normalizeRouteState(routeState: unknown): MapStudioAppRouteState {
  if (!routeState || typeof routeState !== 'object') {
    return {
      targetedOrganismId: null,
      selectedCandidateId: null,
    };
  }

  return {
    targetedOrganismId: normalizeValue(
      'targetedOrganismId' in routeState
        ? (routeState as { targetedOrganismId?: unknown }).targetedOrganismId
        : undefined,
    ),
    selectedCandidateId: normalizeValue(
      'selectedCandidateId' in routeState
        ? (routeState as { selectedCandidateId?: unknown }).selectedCandidateId
        : undefined,
    ),
  };
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
