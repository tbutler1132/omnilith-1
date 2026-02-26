/**
 * Integration Queue read data hook.
 *
 * Loads organism context and proposal queue for one target organism while
 * preserving section-level error handling for resilient queue rendering.
 */

import type { FetchOrganismResponse, FetchProposalsResponse, Proposal } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { fetchWorldMap } from '../../../api/fetch-world-map.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';

export interface IntegrationQueueData {
  readonly targetOrganismId: string;
  readonly organism: FetchOrganismResponse['organism'];
  readonly currentState: FetchOrganismResponse['currentState'];
  readonly proposals: ReadonlyArray<Proposal>;
}

export interface IntegrationQueueSectionErrors {
  readonly proposals: Error | null;
}

interface UseIntegrationQueueDataResult {
  readonly data: IntegrationQueueData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: IntegrationQueueSectionErrors;
}

const EMPTY_SECTION_ERRORS: IntegrationQueueSectionErrors = {
  proposals: null,
};

export function useIntegrationQueueData(targetedOrganismId: string | null): UseIntegrationQueueDataResult {
  const [state, setState] = useState<UseIntegrationQueueDataResult>({
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
        const proposalResult = await Promise.allSettled([
          apiFetch<FetchProposalsResponse>(resolvePublicApiPath(`/organisms/${targetOrganismId}/proposals`)),
        ]);

        if (cancelled) {
          return;
        }

        const proposalsResponse = proposalResult[0];

        setState({
          data: {
            targetOrganismId,
            organism: organism.organism,
            currentState: organism.currentState,
            proposals: proposalsResponse.status === 'fulfilled' ? proposalsResponse.value.proposals : [],
          },
          loading: false,
          error: null,
          sectionErrors: {
            proposals:
              proposalsResponse.status === 'rejected'
                ? toError(proposalsResponse.reason, 'Failed to load proposals for this organism.')
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
          error: toError(error, 'Failed to load integration queue.'),
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
