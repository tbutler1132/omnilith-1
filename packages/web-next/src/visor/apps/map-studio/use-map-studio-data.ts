/**
 * Map Studio read data hook.
 *
 * Loads one targeted map organism plus the signed-in user's organisms so
 * map surfacing can be curated from boundary context.
 */

import type { FetchOrganismResponse, FetchUserOrganismsResponse } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { fetchWorldMap } from '../../../api/fetch-world-map.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';
import { hasSessionId } from '../../../api/session.js';
import { parseSpatialMapPayload, type SpatialMapEntry } from '../../../space/use-spatial-map.js';

export interface MapStudioData {
  readonly targetMapId: string;
  readonly mapOrganism: FetchOrganismResponse['organism'];
  readonly mapState: FetchOrganismResponse['currentState'];
  readonly mapSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly mapEntries: ReadonlyArray<SpatialMapEntry>;
  readonly myOrganisms: FetchUserOrganismsResponse['organisms'];
}

export interface MapStudioSectionErrors {
  readonly candidates: Error | null;
}

interface UseMapStudioDataResult {
  readonly data: MapStudioData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly requiresSignIn: boolean;
  readonly sectionErrors: MapStudioSectionErrors;
}

const EMPTY_SECTION_ERRORS: MapStudioSectionErrors = {
  candidates: null,
};

export function useMapStudioData(targetMapId: string | null): UseMapStudioDataResult {
  const [state, setState] = useState<UseMapStudioDataResult>({
    data: null,
    loading: true,
    error: null,
    requiresSignIn: false,
    sectionErrors: EMPTY_SECTION_ERRORS,
  });

  useEffect(() => {
    let cancelled = false;

    setState({
      data: null,
      loading: true,
      error: null,
      requiresSignIn: false,
      sectionErrors: EMPTY_SECTION_ERRORS,
    });

    const resolvedTargetPromise =
      targetMapId !== null
        ? Promise.resolve(targetMapId)
        : fetchWorldMap().then((platform) => {
            if (!platform.worldMapId) {
              throw new Error('World map pointer is not available');
            }

            return platform.worldMapId;
          });

    resolvedTargetPromise
      .then((resolvedMapId) =>
        apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${resolvedMapId}`)).then((response) => ({
          resolvedMapId,
          response,
        })),
      )
      .then(async ({ resolvedMapId, response }) => {
        const parsedMap = parseSpatialMapPayload(response.currentState?.payload);

        if (!hasSessionId()) {
          if (cancelled) {
            return;
          }

          setState({
            data: {
              targetMapId: resolvedMapId,
              mapOrganism: response.organism,
              mapState: response.currentState,
              mapSize: {
                width: parsedMap.width,
                height: parsedMap.height,
              },
              mapEntries: parsedMap.entries,
              myOrganisms: [],
            },
            loading: false,
            error: null,
            requiresSignIn: true,
            sectionErrors: EMPTY_SECTION_ERRORS,
          });
          return;
        }

        const organismsResult = await Promise.allSettled([apiFetch<FetchUserOrganismsResponse>('/users/me/organisms')]);
        const myOrganismsResult = organismsResult[0];

        if (cancelled) {
          return;
        }

        setState({
          data: {
            targetMapId: resolvedMapId,
            mapOrganism: response.organism,
            mapState: response.currentState,
            mapSize: {
              width: parsedMap.width,
              height: parsedMap.height,
            },
            mapEntries: parsedMap.entries,
            myOrganisms: myOrganismsResult.status === 'fulfilled' ? myOrganismsResult.value.organisms : [],
          },
          loading: false,
          error: null,
          requiresSignIn: false,
          sectionErrors: {
            candidates:
              myOrganismsResult.status === 'rejected'
                ? toError(myOrganismsResult.reason, 'Failed to load your organisms.')
                : null,
          },
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: toError(error, 'Failed to load map studio.'),
          requiresSignIn: false,
          sectionErrors: EMPTY_SECTION_ERRORS,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [targetMapId]);

  return state;
}

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
