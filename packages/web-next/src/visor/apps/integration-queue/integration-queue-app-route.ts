/**
 * Integration Queue app route codec.
 *
 * Persists queue/detail focus, status filter, and selected proposal in the
 * visor URL so integrate and decline work can be resumed directly.
 */

export type IntegrationQueueAppTabId = 'queue' | 'detail';
export type IntegrationQueueStatusFilter = 'open' | 'all';

export interface IntegrationQueueAppRouteState {
  readonly tab: IntegrationQueueAppTabId;
  readonly statusFilter: IntegrationQueueStatusFilter;
  readonly selectedProposalId: string | null;
  readonly targetedOrganismId: string | null;
}

const TAB_QUERY_KEY = 'integrationQueueTab';
const STATUS_QUERY_KEY = 'integrationQueueStatus';
const PROPOSAL_QUERY_KEY = 'proposalId';
const DEFAULT_TAB: IntegrationQueueAppTabId = 'queue';
const DEFAULT_FILTER: IntegrationQueueStatusFilter = 'open';

export function parseIntegrationQueueAppRoute(searchParams: URLSearchParams): IntegrationQueueAppRouteState {
  return {
    tab: normalizeTab(searchParams.get(TAB_QUERY_KEY)),
    statusFilter: normalizeStatusFilter(searchParams.get(STATUS_QUERY_KEY)),
    selectedProposalId: normalizeValue(searchParams.get(PROPOSAL_QUERY_KEY)),
    targetedOrganismId: normalizeValue(searchParams.get('organism')),
  };
}

export function writeIntegrationQueueAppRoute(
  searchParams: URLSearchParams,
  routeState: IntegrationQueueAppRouteState,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  next.set(TAB_QUERY_KEY, routeState.tab);
  next.set(STATUS_QUERY_KEY, routeState.statusFilter);

  if (routeState.selectedProposalId) {
    next.set(PROPOSAL_QUERY_KEY, routeState.selectedProposalId);
  } else {
    next.delete(PROPOSAL_QUERY_KEY);
  }

  if (routeState.targetedOrganismId) {
    next.set('organism', routeState.targetedOrganismId);
  } else {
    next.delete('organism');
  }

  return next;
}

export function clearIntegrationQueueAppRoute(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(TAB_QUERY_KEY);
  next.delete(STATUS_QUERY_KEY);
  next.delete(PROPOSAL_QUERY_KEY);
  return next;
}

export function resolveIntegrationQueueAppRouteState(
  routeState: unknown,
  fallbackOrganismId: string | null,
): IntegrationQueueAppRouteState {
  const normalized = normalizeRouteState(routeState);

  return {
    ...normalized,
    targetedOrganismId: normalized.targetedOrganismId ?? fallbackOrganismId,
  };
}

function normalizeRouteState(routeState: unknown): IntegrationQueueAppRouteState {
  if (!routeState || typeof routeState !== 'object') {
    return {
      tab: DEFAULT_TAB,
      statusFilter: DEFAULT_FILTER,
      selectedProposalId: null,
      targetedOrganismId: null,
    };
  }

  return {
    tab: normalizeTab('tab' in routeState ? (routeState as { tab?: unknown }).tab : undefined),
    statusFilter: normalizeStatusFilter(
      'statusFilter' in routeState ? (routeState as { statusFilter?: unknown }).statusFilter : undefined,
    ),
    selectedProposalId: normalizeValue(
      'selectedProposalId' in routeState
        ? (routeState as { selectedProposalId?: unknown }).selectedProposalId
        : undefined,
    ),
    targetedOrganismId: normalizeValue(
      'targetedOrganismId' in routeState
        ? (routeState as { targetedOrganismId?: unknown }).targetedOrganismId
        : undefined,
    ),
  };
}

function normalizeTab(value: unknown): IntegrationQueueAppTabId {
  if (value === 'queue' || value === 'detail') {
    return value;
  }

  return DEFAULT_TAB;
}

function normalizeStatusFilter(value: unknown): IntegrationQueueStatusFilter {
  if (value === 'open' || value === 'all') {
    return value;
  }

  return DEFAULT_FILTER;
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
