/**
 * Boundary cadence data hook.
 *
 * Loads composed children for one organism and fetches each child's current
 * state so the cadence app can project Move 48 cadence organisms.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';
import type { BoundaryCadenceCandidateChild } from './boundary-cadence-presenter.js';

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

interface CompositionChildRecord {
  readonly childId: string;
}

interface FetchChildrenResponse {
  readonly children: ReadonlyArray<CompositionChildRecord>;
}

export interface BoundaryCadenceData {
  readonly boundary: {
    readonly id: string;
    readonly name: string;
  };
  readonly children: ReadonlyArray<BoundaryCadenceCandidateChild>;
}

interface UseBoundaryCadenceResult {
  readonly data: BoundaryCadenceData | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

async function loadCadenceChildren(parentOrganismId: string): Promise<BoundaryCadenceData> {
  const parentResponse = await apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${parentOrganismId}`));
  const childResponse = await apiFetch<FetchChildrenResponse>(
    resolvePublicApiPath(`/organisms/${parentOrganismId}/children`),
  );

  const childRecords = await Promise.all(
    childResponse.children.map(async (child): Promise<BoundaryCadenceCandidateChild | null> => {
      try {
        const response = await apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${child.childId}`));

        return {
          childId: child.childId,
          name: response.organism.name,
          contentTypeId: response.currentState?.contentTypeId ?? null,
          payload: response.currentState?.payload,
        };
      } catch {
        return null;
      }
    }),
  );

  return {
    boundary: {
      id: parentResponse.organism.id,
      name: parentResponse.organism.name,
    },
    children: childRecords.filter((child): child is BoundaryCadenceCandidateChild => child !== null),
  };
}

export function useBoundaryCadence(organismId: string | null): UseBoundaryCadenceResult {
  const [state, setState] = useState<UseBoundaryCadenceResult>({
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
    setState({
      data: null,
      loading: true,
      error: null,
    });

    loadCadenceChildren(organismId)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setState({
          data,
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
          error: error instanceof Error ? error : new Error('Failed to load boundary cadence'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [organismId]);

  return state;
}
