/**
 * Organism overview data hook.
 *
 * Loads one concrete organism for the Organism app:
 * an explicitly targeted organism when provided, otherwise the world map.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { fetchWorldMap } from '../../../api/fetch-world-map.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';

interface OrganismRecord {
  readonly id: string;
  readonly name: string;
}

interface OrganismStateRecord {
  readonly contentTypeId: string;
  readonly payload: unknown;
}

interface FetchOrganismResponse {
  readonly organism: OrganismRecord;
  readonly currentState: OrganismStateRecord | null;
}

export interface OrganismOverviewData {
  readonly organism: OrganismRecord;
  readonly currentState: OrganismStateRecord | null;
}

interface UseOrganismOverviewResult {
  readonly data: OrganismOverviewData | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

export function useOrganismOverview(targetedOrganismId: string | null): UseOrganismOverviewResult {
  const [state, setState] = useState<UseOrganismOverviewResult>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    setState({
      data: null,
      loading: true,
      error: null,
    });

    const loadOrganismPromise =
      targetedOrganismId !== null
        ? Promise.resolve(targetedOrganismId)
        : fetchWorldMap().then((platform) => {
            if (!platform.worldMapId) {
              throw new Error('World map pointer is not available');
            }

            return platform.worldMapId;
          });

    loadOrganismPromise
      .then((organismId) => apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${organismId}`)))
      .then((response) => {
        if (cancelled) {
          return;
        }

        setState({
          data: {
            organism: response.organism,
            currentState: response.currentState,
          },
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load organism overview'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [targetedOrganismId]);

  return state;
}
