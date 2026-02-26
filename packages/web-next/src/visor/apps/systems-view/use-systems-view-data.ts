/**
 * Systems View read data hook.
 *
 * Loads target organism and composition context for structural viewing while
 * allowing section-level composition failures to degrade gracefully.
 */

import type {
  FetchChildrenWithStateResponse,
  FetchOrganismResponse,
  FetchParentResponse,
} from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { fetchWorldMap } from '../../../api/fetch-world-map.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';

export interface SystemsViewData {
  readonly targetOrganismId: string;
  readonly organism: FetchOrganismResponse['organism'];
  readonly currentState: FetchOrganismResponse['currentState'];
  readonly parent: FetchParentResponse['parent'];
  readonly children: FetchChildrenWithStateResponse['children'];
}

export interface SystemsViewSectionErrors {
  readonly composition: Error | null;
}

interface UseSystemsViewDataResult {
  readonly data: SystemsViewData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: SystemsViewSectionErrors;
}

const EMPTY_SECTION_ERRORS: SystemsViewSectionErrors = {
  composition: null,
};

export function useSystemsViewData(targetedOrganismId: string | null): UseSystemsViewDataResult {
  const [state, setState] = useState<UseSystemsViewDataResult>({
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

    const resolvedTargetPromise =
      targetedOrganismId !== null
        ? Promise.resolve(targetedOrganismId)
        : fetchWorldMap().then((platform) => {
            if (!platform.worldMapId) {
              throw new Error('World map pointer is not available');
            }

            return platform.worldMapId;
          });

    resolvedTargetPromise
      .then((targetOrganismId) =>
        apiFetch<FetchOrganismResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}`)).then((organism) => ({
          targetOrganismId,
          organism,
        })),
      )
      .then(async ({ targetOrganismId, organism }) => {
        const sectionRequests = await Promise.allSettled([
          apiFetch<FetchParentResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}/parent`)),
          apiFetch<FetchChildrenWithStateResponse>(
            resolvePublicApiPath(`/organisms/${targetOrganismId}/children-with-state`),
          ),
        ]);

        if (cancelled) {
          return;
        }

        const parentResult = sectionRequests[0];
        const childrenResult = sectionRequests[1];

        const compositionError =
          parentResult.status === 'rejected'
            ? toError(parentResult.reason, 'Failed to load parent composition.')
            : childrenResult.status === 'rejected'
              ? toError(childrenResult.reason, 'Failed to load child composition.')
              : null;

        setState({
          data: {
            targetOrganismId,
            organism: organism.organism,
            currentState: organism.currentState,
            parent: parentResult.status === 'fulfilled' ? parentResult.value.parent : null,
            children: childrenResult.status === 'fulfilled' ? childrenResult.value.children : [],
          },
          loading: false,
          error: null,
          sectionErrors: {
            composition: compositionError,
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
          error: toError(error, 'Failed to load systems view.'),
          sectionErrors: EMPTY_SECTION_ERRORS,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [targetedOrganismId]);

  return state;
}

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
