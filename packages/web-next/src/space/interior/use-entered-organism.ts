/**
 * Entered organism hook.
 *
 * Loads one organism with current state so Space can render non-map
 * content types after in-space enter transitions.
 */

import type { FetchOrganismResponse } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/api-client.js';
import { resolvePublicApiPath } from '../../api/public-api-path.js';

type OrganismRecord = FetchOrganismResponse['organism'];
type OrganismStateRecord = FetchOrganismResponse['currentState'];

export interface EnteredOrganismData {
  readonly organism: OrganismRecord;
  readonly currentState: OrganismStateRecord;
}

interface UseEnteredOrganismResult {
  readonly data: EnteredOrganismData | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const enteredOrganismCacheById = new Map<string, EnteredOrganismData>();
const enteredOrganismLoadById = new Map<string, Promise<EnteredOrganismData>>();

function toEnteredOrganismData(response: FetchOrganismResponse): EnteredOrganismData {
  return {
    organism: response.organism,
    currentState: response.currentState,
  };
}

function readCachedEnteredOrganism(organismId: string): EnteredOrganismData | null {
  return enteredOrganismCacheById.get(organismId) ?? null;
}

export function clearEnteredOrganismCache(): void {
  enteredOrganismCacheById.clear();
  enteredOrganismLoadById.clear();
}

export async function loadEnteredOrganismById(organismId: string): Promise<EnteredOrganismData> {
  const cached = readCachedEnteredOrganism(organismId);
  if (cached) {
    return cached;
  }

  const inFlight = enteredOrganismLoadById.get(organismId);
  if (inFlight) {
    return inFlight;
  }

  const loadPromise = apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${organismId}`))
    .then((response) => {
      const data = toEnteredOrganismData(response);
      enteredOrganismCacheById.set(organismId, data);
      enteredOrganismLoadById.delete(organismId);
      return data;
    })
    .catch((error) => {
      enteredOrganismLoadById.delete(organismId);
      throw error;
    });

  enteredOrganismLoadById.set(organismId, loadPromise);
  return loadPromise;
}

export function useEnteredOrganism(organismId: string | null): UseEnteredOrganismResult {
  const [state, setState] = useState<UseEnteredOrganismResult>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!organismId) {
      setState({
        data: null,
        loading: false,
        error: null,
      });
      return;
    }

    const cached = readCachedEnteredOrganism(organismId);
    if (cached) {
      setState({
        data: cached,
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }));

    loadEnteredOrganismById(organismId)
      .then((data) => {
        if (cancelled) return;

        setState({
          data,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;

        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load organism',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [organismId]);

  return state;
}
