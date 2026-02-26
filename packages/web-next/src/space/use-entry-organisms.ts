/**
 * Entry organism metadata hook.
 *
 * Loads lightweight organism state for spatial-map entries so Space can
 * decide whether an entry is enterable and where it should route.
 */

import type { FetchOrganismBatchResponse, FetchOrganismResponse } from '@omnilith/api-contracts';
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

function createFallbackMetadata(organismId: string): EntryOrganismMetadata {
  return {
    organismId,
    name: organismId,
    contentTypeId: null,
    currentPayload: null,
    enterTargetMapId: null,
  };
}

function toEntryOrganismMetadata(response: FetchOrganismResponse): EntryOrganismMetadata {
  return {
    organismId: response.organism.id,
    name: response.organism.name,
    contentTypeId: response.currentState?.contentTypeId ?? null,
    currentPayload: response.currentState?.payload ?? null,
    enterTargetMapId: resolveEnterTargetMapId(response),
  };
}

async function fetchEntryOrganismsById(
  ids: ReadonlyArray<string>,
): Promise<Readonly<Record<string, EntryOrganismMetadata>>> {
  if (ids.length === 0) {
    return {};
  }

  const byId: Record<string, EntryOrganismMetadata> = Object.fromEntries(
    ids.map((id) => [id, createFallbackMetadata(id)]),
  );
  const query = encodeURIComponent(ids.join(','));
  const response = await apiFetch<FetchOrganismBatchResponse>(resolvePublicApiPath(`/organisms?ids=${query}`));

  response.organisms.forEach((organismResponse) => {
    byId[organismResponse.organism.id] = toEntryOrganismMetadata(organismResponse);
  });

  return byId;
}

export function resolveEnterTargetMapId(response: FetchOrganismResponse): string | null {
  const state = response.currentState;
  if (!state) {
    return null;
  }

  if (state.contentTypeId === 'spatial-map') {
    return response.organism.id;
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

    fetchEntryOrganismsById(uniqueIds)
      .then((byId) => {
        if (cancelled) return;

        setState({
          byId,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;

        setState({
          byId: Object.fromEntries(uniqueIds.map((id) => [id, createFallbackMetadata(id)])),
          loading: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [uniqueIds]);

  return state;
}
