/**
 * Boundary cadence data hook.
 *
 * Loads one boundary and its composed children (with current state) so the
 * cadence app can project Move 48 cadence organisms in a single read pass.
 */

import type { FetchChildrenWithStateResponse, FetchOrganismResponse } from '@omnilith/api-contracts';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';
import type { BoundaryCadenceCandidateChild } from './boundary-cadence-presenter.js';

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
  readonly reload: () => void;
}

interface UseBoundaryCadenceState {
  readonly data: BoundaryCadenceData | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

async function loadCadenceChildren(parentOrganismId: string, reloadCount: number): Promise<BoundaryCadenceData> {
  void reloadCount;

  const parentResponse = await apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${parentOrganismId}`));
  const childResponse = await apiFetch<FetchChildrenWithStateResponse>(
    resolvePublicApiPath(`/organisms/${parentOrganismId}/children-with-state`),
  );

  const childRecords: BoundaryCadenceCandidateChild[] = childResponse.children.map((child) => ({
    childId: child.composition.childId,
    name: child.organism.name,
    openTrunk: child.organism.openTrunk,
    contentTypeId: child.currentState?.contentTypeId ?? null,
    payload: child.currentState?.payload,
  }));

  return {
    boundary: {
      id: parentResponse.organism.id,
      name: parentResponse.organism.name,
    },
    children: childRecords,
  };
}

export function useBoundaryCadence(organismId: string | null): UseBoundaryCadenceResult {
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<UseBoundaryCadenceState>({
    data: null,
    loading: false,
    error: null,
  });

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

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

    loadCadenceChildren(organismId, reloadCount)
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
  }, [organismId, reloadCount]);

  return {
    ...state,
    reload,
  };
}
