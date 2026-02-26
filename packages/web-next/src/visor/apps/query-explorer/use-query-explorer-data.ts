/**
 * Query Explorer read data hook.
 *
 * Loads global organism query results from infrastructure retrieval endpoints
 * using app route filters and pagination state.
 */

import type { FetchOrganismsResponse } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import type { QueryExplorerAppRouteState } from './query-explorer-app-route.js';

export interface QueryExplorerData {
  readonly targetOrganismId: string | null;
  readonly organisms: FetchOrganismsResponse['organisms'];
  readonly filters: {
    readonly query: string;
    readonly contentTypeId: string | null;
    readonly createdBy: string | null;
    readonly limit: number;
    readonly offset: number;
  };
}

export interface QueryExplorerSectionErrors {
  readonly results: Error | null;
}

interface UseQueryExplorerDataResult {
  readonly data: QueryExplorerData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: QueryExplorerSectionErrors;
}

const EMPTY_SECTION_ERRORS: QueryExplorerSectionErrors = {
  results: null,
};

export function useQueryExplorerData(routeState: QueryExplorerAppRouteState): UseQueryExplorerDataResult {
  const [state, setState] = useState<UseQueryExplorerDataResult>({
    data: null,
    loading: true,
    error: null,
    sectionErrors: EMPTY_SECTION_ERRORS,
  });

  useEffect(() => {
    let cancelled = false;

    setState({
      data: null,
      loading: true,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    });

    const searchParams = new URLSearchParams();
    if (routeState.query.length > 0) {
      searchParams.set('q', routeState.query);
    }
    if (routeState.contentTypeId) {
      searchParams.set('contentTypeId', routeState.contentTypeId);
    }
    if (routeState.createdBy) {
      searchParams.set('createdBy', routeState.createdBy);
    }
    searchParams.set('limit', String(routeState.limit));
    searchParams.set('offset', String(routeState.offset));

    const path = `/organisms?${searchParams.toString()}`;

    apiFetch<FetchOrganismsResponse>(path)
      .then((response) => {
        if (cancelled) {
          return;
        }

        setState({
          data: {
            targetOrganismId: routeState.targetedOrganismId,
            organisms: response.organisms,
            filters: {
              query: routeState.query,
              contentTypeId: routeState.contentTypeId,
              createdBy: routeState.createdBy,
              limit: routeState.limit,
              offset: routeState.offset,
            },
          },
          loading: false,
          error: null,
          sectionErrors: EMPTY_SECTION_ERRORS,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: toError(error, 'Failed to load query explorer.'),
          sectionErrors: EMPTY_SECTION_ERRORS,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    routeState.contentTypeId,
    routeState.createdBy,
    routeState.limit,
    routeState.offset,
    routeState.query,
    routeState.targetedOrganismId,
  ]);

  return state;
}

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
