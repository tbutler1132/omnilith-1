/**
 * Systems View app route codec.
 *
 * Persists targeted organism and selected child node so structural navigation
 * can be deep-linked and resumed in the visor.
 */

export interface SystemsViewAppRouteState {
  readonly targetedOrganismId: string | null;
  readonly selectedChildId: string | null;
}

const SELECTED_CHILD_QUERY_KEY = 'systemsViewChild';

export function parseSystemsViewAppRoute(searchParams: URLSearchParams): SystemsViewAppRouteState {
  return {
    targetedOrganismId: normalizeValue(searchParams.get('organism')),
    selectedChildId: normalizeValue(searchParams.get(SELECTED_CHILD_QUERY_KEY)),
  };
}

export function writeSystemsViewAppRoute(
  searchParams: URLSearchParams,
  routeState: SystemsViewAppRouteState,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  if (routeState.targetedOrganismId) {
    next.set('organism', routeState.targetedOrganismId);
  } else {
    next.delete('organism');
  }

  if (routeState.selectedChildId) {
    next.set(SELECTED_CHILD_QUERY_KEY, routeState.selectedChildId);
  } else {
    next.delete(SELECTED_CHILD_QUERY_KEY);
  }

  return next;
}

export function clearSystemsViewAppRoute(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(SELECTED_CHILD_QUERY_KEY);
  return next;
}

export function resolveSystemsViewAppRouteState(
  routeState: unknown,
  fallbackOrganismId: string | null,
): SystemsViewAppRouteState {
  const normalized = normalizeRouteState(routeState);

  return {
    targetedOrganismId: normalized.targetedOrganismId ?? fallbackOrganismId,
    selectedChildId: normalized.selectedChildId,
  };
}

function normalizeRouteState(routeState: unknown): SystemsViewAppRouteState {
  if (!routeState || typeof routeState !== 'object') {
    return {
      targetedOrganismId: null,
      selectedChildId: null,
    };
  }

  return {
    targetedOrganismId: normalizeValue(
      'targetedOrganismId' in routeState
        ? (routeState as { targetedOrganismId?: unknown }).targetedOrganismId
        : undefined,
    ),
    selectedChildId: normalizeValue(
      'selectedChildId' in routeState ? (routeState as { selectedChildId?: unknown }).selectedChildId : undefined,
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
