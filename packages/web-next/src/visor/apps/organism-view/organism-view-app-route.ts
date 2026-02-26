/**
 * Organism View app route codec.
 *
 * Keeps Organism View tab and target navigation self-contained while still
 * allowing deep links through shared visor URL query state.
 */

export type OrganismViewAppTabId = 'state' | 'state-history' | 'composition' | 'governance';

export interface OrganismViewAppRouteState {
  readonly tab: OrganismViewAppTabId;
  readonly targetedOrganismId: string | null;
}

const DEFAULT_TAB: OrganismViewAppTabId = 'state';
const TAB_QUERY_KEY = 'organismViewTab';

export function parseOrganismViewAppRoute(searchParams: URLSearchParams): OrganismViewAppRouteState {
  return {
    tab: normalizeTabId(searchParams.get(TAB_QUERY_KEY)),
    targetedOrganismId: normalizeValue(searchParams.get('organism')),
  };
}

export function writeOrganismViewAppRoute(
  searchParams: URLSearchParams,
  routeState: OrganismViewAppRouteState,
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

export function clearOrganismViewAppRoute(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(TAB_QUERY_KEY);
  return next;
}

export function resolveOrganismViewAppRouteState(
  routeState: unknown,
  fallbackOrganismId: string | null,
): OrganismViewAppRouteState {
  const normalized = normalizeRouteState(routeState);

  return {
    tab: normalized.tab,
    targetedOrganismId: normalized.targetedOrganismId ?? fallbackOrganismId,
  };
}

function normalizeRouteState(routeState: unknown): OrganismViewAppRouteState {
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

function normalizeTabId(value: unknown): OrganismViewAppTabId {
  if (value === 'state' || value === 'state-history' || value === 'composition' || value === 'governance') {
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
