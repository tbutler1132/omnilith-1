/**
 * My organisms data hook.
 *
 * Loads organisms created by the current user so the Organism app can offer
 * a direct "My organisms" navigation surface when the user is signed in.
 */

import type { FetchUserOrganismsResponse } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { hasSessionId } from '../../../api/session.js';

export interface MyOrganismSummary {
  readonly id: string;
  readonly name: string;
  readonly contentTypeId: string | null;
}

interface UseMyOrganismsResult {
  readonly organisms: ReadonlyArray<MyOrganismSummary>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly requiresSignIn: boolean;
}

export function useMyOrganisms(enabled: boolean): UseMyOrganismsResult {
  const [state, setState] = useState<UseMyOrganismsResult>({
    organisms: [],
    loading: false,
    error: null,
    requiresSignIn: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        organisms: [],
        loading: false,
        error: null,
        requiresSignIn: false,
      });
      return;
    }

    if (!hasSessionId()) {
      setState({
        organisms: [],
        loading: false,
        error: null,
        requiresSignIn: true,
      });
      return;
    }

    let cancelled = false;

    setState({
      organisms: [],
      loading: true,
      error: null,
      requiresSignIn: false,
    });

    apiFetch<FetchUserOrganismsResponse>('/users/me/organisms')
      .then((response) => {
        if (cancelled) {
          return;
        }

        setState({
          organisms: response.organisms.map((entry) => ({
            id: entry.organism.id,
            name: entry.organism.name,
            contentTypeId: entry.currentState?.contentTypeId ?? null,
          })),
          loading: false,
          error: null,
          requiresSignIn: false,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          organisms: [],
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load user organisms'),
          requiresSignIn: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
