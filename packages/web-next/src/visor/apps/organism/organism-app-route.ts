/**
 * Organism app route codec.
 *
 * Keeps Organism app navigation self-contained while still letting the
 * platform shell persist deep links in the shared visor URL.
 */

export type OrganismAppTabId = 'overview' | 'my-organisms';

export interface OrganismAppRouteState {
  readonly tab: OrganismAppTabId;
  readonly targetedOrganismId: string | null;
}

const DEFAULT_TAB: OrganismAppTabId = 'overview';
const TAB_QUERY_KEY = 'organismTab';

export function parseOrganismAppRoute(searchParams: URLSearchParams): OrganismAppRouteState {
  return {
    tab: normalizeTabId(searchParams.get(TAB_QUERY_KEY)),
    targetedOrganismId: normalizeValue(searchParams.get('organism')),
  };
}

export function writeOrganismAppRoute(
  searchParams: URLSearchParams,
  routeState: OrganismAppRouteState,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  next.set(TAB_QUERY_KEY, routeState.tab);

  if (routeState.targetedOrganismId) {
    next.set('organism', routeState.targetedOrganismId);
  } else {
    next.delete('organism');
  }

  return next;
}

export function clearOrganismAppRoute(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(TAB_QUERY_KEY);
  return next;
}

export function resolveOrganismAppRouteState(
  routeState: unknown,
  fallbackOrganismId: string | null,
): OrganismAppRouteState {
  const normalized = normalizeRouteState(routeState);

  return {
    tab: normalized.tab,
    targetedOrganismId: normalized.targetedOrganismId ?? fallbackOrganismId,
  };
}

function normalizeRouteState(routeState: unknown): OrganismAppRouteState {
  if (!routeState || typeof routeState !== 'object') {
    return {
      tab: DEFAULT_TAB,
      targetedOrganismId: null,
    };
  }

  const tab = normalizeTabId('tab' in routeState ? (routeState as { tab?: unknown }).tab : undefined);
  const targetedOrganismId = normalizeValue(
    'targetedOrganismId' in routeState
      ? (routeState as { targetedOrganismId?: unknown }).targetedOrganismId
      : undefined,
  );

  return {
    tab,
    targetedOrganismId,
  };
}

function normalizeTabId(value: unknown): OrganismAppTabId {
  if (value === 'overview' || value === 'my-organisms') {
    return value;
  }

  return DEFAULT_TAB;
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
