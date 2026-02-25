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

    let cancelled = false;
    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }));

    apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${organismId}`))
      .then((response) => {
        if (cancelled) return;

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
