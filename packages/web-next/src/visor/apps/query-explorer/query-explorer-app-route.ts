/**
 * Query Explorer app route codec.
 *
 * Persists global query filters, pagination, and selected result context so
 * retrieval work can be deep-linked and resumed in the visor.
 */

export interface QueryExplorerAppRouteState {
  readonly targetedOrganismId: string | null;
  readonly query: string;
  readonly contentTypeId: string | null;
  readonly createdBy: string | null;
  readonly limit: number;
  readonly offset: number;
  readonly selectedOrganismId: string | null;
}

const QUERY_TEXT_KEY = 'queryExplorerQ';
const CONTENT_TYPE_KEY = 'queryExplorerContentTypeId';
const CREATED_BY_KEY = 'queryExplorerCreatedBy';
const LIMIT_KEY = 'queryExplorerLimit';
const OFFSET_KEY = 'queryExplorerOffset';
const SELECTED_KEY = 'queryExplorerSelected';

const QUERY_EXPLORER_MAX_LIMIT = 100;

export const QUERY_EXPLORER_DEFAULT_LIMIT = 25;
export const QUERY_EXPLORER_DEFAULT_OFFSET = 0;

export function parseQueryExplorerAppRoute(searchParams: URLSearchParams): QueryExplorerAppRouteState {
  return {
    targetedOrganismId: normalizeNullableString(searchParams.get('organism')),
    query: normalizeQueryText(searchParams.get(QUERY_TEXT_KEY)),
    contentTypeId: normalizeNullableString(searchParams.get(CONTENT_TYPE_KEY)),
    createdBy: normalizeNullableString(searchParams.get(CREATED_BY_KEY)),
    limit: normalizeLimit(searchParams.get(LIMIT_KEY)),
    offset: normalizeOffset(searchParams.get(OFFSET_KEY)),
    selectedOrganismId: normalizeNullableString(searchParams.get(SELECTED_KEY)),
  };
}

export function writeQueryExplorerAppRoute(
  searchParams: URLSearchParams,
  routeState: QueryExplorerAppRouteState,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  if (routeState.targetedOrganismId) {
    next.set('organism', routeState.targetedOrganismId);
  } else {
    next.delete('organism');
  }

  if (routeState.query.length > 0) {
    next.set(QUERY_TEXT_KEY, routeState.query);
  } else {
    next.delete(QUERY_TEXT_KEY);
  }

  if (routeState.contentTypeId) {
    next.set(CONTENT_TYPE_KEY, routeState.contentTypeId);
  } else {
    next.delete(CONTENT_TYPE_KEY);
  }

  if (routeState.createdBy) {
    next.set(CREATED_BY_KEY, routeState.createdBy);
  } else {
    next.delete(CREATED_BY_KEY);
  }

  next.set(LIMIT_KEY, String(routeState.limit));
  next.set(OFFSET_KEY, String(routeState.offset));

  if (routeState.selectedOrganismId) {
    next.set(SELECTED_KEY, routeState.selectedOrganismId);
  } else {
    next.delete(SELECTED_KEY);
  }

  return next;
}

export function clearQueryExplorerAppRoute(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(QUERY_TEXT_KEY);
  next.delete(CONTENT_TYPE_KEY);
  next.delete(CREATED_BY_KEY);
  next.delete(LIMIT_KEY);
  next.delete(OFFSET_KEY);
  next.delete(SELECTED_KEY);
  return next;
}

export function resolveQueryExplorerAppRouteState(
  routeState: unknown,
  fallbackOrganismId: string | null,
): QueryExplorerAppRouteState {
  const normalized = normalizeRouteState(routeState);

  return {
    ...normalized,
    targetedOrganismId: normalized.targetedOrganismId ?? fallbackOrganismId,
  };
}

function normalizeRouteState(routeState: unknown): QueryExplorerAppRouteState {
  if (!routeState || typeof routeState !== 'object') {
    return {
      targetedOrganismId: null,
      query: '',
      contentTypeId: null,
      createdBy: null,
      limit: QUERY_EXPLORER_DEFAULT_LIMIT,
      offset: QUERY_EXPLORER_DEFAULT_OFFSET,
      selectedOrganismId: null,
    };
  }

  return {
    targetedOrganismId: normalizeNullableString(
      'targetedOrganismId' in routeState
        ? (routeState as { targetedOrganismId?: unknown }).targetedOrganismId
        : undefined,
    ),
    query: normalizeQueryText('query' in routeState ? (routeState as { query?: unknown }).query : undefined),
    contentTypeId: normalizeNullableString(
      'contentTypeId' in routeState ? (routeState as { contentTypeId?: unknown }).contentTypeId : undefined,
    ),
    createdBy: normalizeNullableString(
      'createdBy' in routeState ? (routeState as { createdBy?: unknown }).createdBy : undefined,
    ),
    limit: normalizeLimit('limit' in routeState ? (routeState as { limit?: unknown }).limit : undefined),
    offset: normalizeOffset('offset' in routeState ? (routeState as { offset?: unknown }).offset : undefined),
    selectedOrganismId: normalizeNullableString(
      'selectedOrganismId' in routeState
        ? (routeState as { selectedOrganismId?: unknown }).selectedOrganismId
        : undefined,
    ),
  };
}

function normalizeQueryText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeLimit(value: unknown): number {
  const parsed = normalizeInteger(value);
  if (parsed === null || parsed < 1) {
    return QUERY_EXPLORER_DEFAULT_LIMIT;
  }

  return Math.min(parsed, QUERY_EXPLORER_MAX_LIMIT);
}

function normalizeOffset(value: unknown): number {
  const parsed = normalizeInteger(value);
  if (parsed === null || parsed < 0) {
    return QUERY_EXPLORER_DEFAULT_OFFSET;
  }

  return parsed;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  if (!/^-?\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
