/**
 * Organism View read data hook.
 *
 * Loads universal read surfaces for one organism while tolerating section-level
 * failures so state history, composition, and governance can degrade separately.
 */

import type {
  FetchChildrenWithStateResponse,
  FetchOrganismResponse,
  FetchParentResponse,
  FetchProposalsResponse,
  FetchStateHistoryResponse,
  FetchVisibilityResponse,
} from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { fetchWorldMap } from '../../../api/fetch-world-map.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';

export interface OrganismViewData {
  readonly targetOrganismId: string;
  readonly organism: FetchOrganismResponse['organism'];
  readonly currentState: FetchOrganismResponse['currentState'];
  readonly stateHistory: FetchStateHistoryResponse['states'];
  readonly parent: FetchParentResponse['parent'];
  readonly children: FetchChildrenWithStateResponse['children'];
  readonly visibility: FetchVisibilityResponse['visibility'] | null;
  readonly proposalCount: number | null;
}

export interface OrganismViewSectionErrors {
  readonly stateHistory: Error | null;
  readonly composition: Error | null;
  readonly governance: Error | null;
}

interface UseOrganismViewDataResult {
  readonly data: OrganismViewData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: OrganismViewSectionErrors;
}

const EMPTY_SECTION_ERRORS: OrganismViewSectionErrors = {
  stateHistory: null,
  composition: null,
  governance: null,
};

export function useOrganismViewData(targetedOrganismId: string | null): UseOrganismViewDataResult {
  const [state, setState] = useState<UseOrganismViewDataResult>({
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
          apiFetch<FetchStateHistoryResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}/states`)),
          apiFetch<FetchParentResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}/parent`)),
          apiFetch<FetchChildrenWithStateResponse>(
            resolvePublicApiPath(`/organisms/${targetOrganismId}/children-with-state`),
          ),
          apiFetch<FetchVisibilityResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}/visibility`)),
          apiFetch<FetchProposalsResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}/proposals`)),
        ]);

        if (cancelled) {
          return;
        }

        const stateHistoryResult = sectionRequests[0];
        const parentResult = sectionRequests[1];
        const childrenResult = sectionRequests[2];
        const visibilityResult = sectionRequests[3];
        const proposalsResult = sectionRequests[4];

        const compositionError =
          parentResult.status === 'rejected'
            ? toError(parentResult.reason, 'Failed to load parent composition.')
            : childrenResult.status === 'rejected'
              ? toError(childrenResult.reason, 'Failed to load child composition.')
              : null;

        const governanceError =
          visibilityResult.status === 'rejected'
            ? toError(visibilityResult.reason, 'Failed to load visibility.')
            : proposalsResult.status === 'rejected'
              ? toError(proposalsResult.reason, 'Failed to load proposals.')
              : null;

        setState({
          data: {
            targetOrganismId,
            organism: organism.organism,
            currentState: organism.currentState,
            stateHistory: stateHistoryResult.status === 'fulfilled' ? stateHistoryResult.value.states : [],
            parent: parentResult.status === 'fulfilled' ? parentResult.value.parent : null,
            children: childrenResult.status === 'fulfilled' ? childrenResult.value.children : [],
            visibility: visibilityResult.status === 'fulfilled' ? visibilityResult.value.visibility : null,
            proposalCount: proposalsResult.status === 'fulfilled' ? proposalsResult.value.proposals.length : null,
          },
          loading: false,
          error: null,
          sectionErrors: {
            stateHistory:
              stateHistoryResult.status === 'rejected'
                ? toError(stateHistoryResult.reason, 'Failed to load state history.')
                : null,
            composition: compositionError,
            governance: governanceError,
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
          error: toError(error, 'Failed to load organism view.'),
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
