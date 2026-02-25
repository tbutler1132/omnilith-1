/**
 * Entry organism metadata hook.
 *
 * Loads lightweight organism state for spatial-map entries so Space can
 * decide whether an entry is enterable and where it should route.
 */

import type { FetchOrganismResponse } from '@omnilith/api-contracts';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/api-client.js';
import { resolvePublicApiPath } from '../api/public-api-path.js';

export type { FetchOrganismResponse };

export interface EntryOrganismMetadata {
  readonly organismId: string;
  readonly name: string;
  readonly contentTypeId: string | null;
  readonly currentPayload: unknown;
  readonly enterTargetMapId: string | null;
}

interface UseEntryOrganismsResult {
  readonly byId: Readonly<Record<string, EntryOrganismMetadata>>;
  readonly loading: boolean;
}

export function resolveEnterTargetMapId(response: FetchOrganismResponse): string | null {
  const state = response.currentState;
  if (!state) {
    return null;
  }

  if (state.contentTypeId === 'spatial-map') {
    return response.organism.id;
  }

  if (state.contentTypeId === 'community') {
    const payload = state.payload as Record<string, unknown> | null;
    const mapOrganismId = payload?.mapOrganismId;
    return typeof mapOrganismId === 'string' ? mapOrganismId : null;
  }

  return null;
}

export function useEntryOrganisms(ids: ReadonlyArray<string>): UseEntryOrganismsResult {
  const uniqueIds = useMemo(() => Array.from(new Set(ids)), [ids]);
  const [state, setState] = useState<UseEntryOrganismsResult>({
    byId: {},
    loading: false,
  });

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setState({ byId: {}, loading: false });
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true }));

    Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const response = await apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${id}`));
          const metadata: EntryOrganismMetadata = {
            organismId: response.organism.id,
            name: response.organism.name,
            contentTypeId: response.currentState?.contentTypeId ?? null,
            currentPayload: response.currentState?.payload ?? null,
            enterTargetMapId: resolveEnterTargetMapId(response),
          };
          return [id, metadata] as const;
        } catch {
          return [
            id,
            {
              organismId: id,
              name: id,
              contentTypeId: null,
              currentPayload: null,
              enterTargetMapId: null,
            } satisfies EntryOrganismMetadata,
          ] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;

      const byId = Object.fromEntries(pairs);
      setState({
        byId,
        loading: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [uniqueIds]);

  return state;
}
