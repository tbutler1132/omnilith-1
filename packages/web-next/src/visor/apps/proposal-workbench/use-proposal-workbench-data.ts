/**
 * Proposal Workbench read data hook.
 *
 * Loads target organism context plus proposal list, while tolerating proposal
 * section failures so the organism frame remains visible.
 */

import type { FetchOrganismResponse, FetchProposalsResponse, Proposal } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/api-client.js';
import { fetchWorldMap } from '../../../api/fetch-world-map.js';
import { resolvePublicApiPath } from '../../../api/public-api-path.js';

export interface ProposalWorkbenchData {
  readonly targetOrganismId: string;
  readonly organism: FetchOrganismResponse['organism'];
  readonly currentState: FetchOrganismResponse['currentState'];
  readonly proposals: ReadonlyArray<Proposal>;
}

export interface ProposalWorkbenchSectionErrors {
  readonly proposals: Error | null;
}

interface UseProposalWorkbenchDataResult {
  readonly data: ProposalWorkbenchData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: ProposalWorkbenchSectionErrors;
}

const EMPTY_SECTION_ERRORS: ProposalWorkbenchSectionErrors = {
  proposals: null,
};

export function useProposalWorkbenchData(targetedOrganismId: string | null): UseProposalWorkbenchDataResult {
  const [state, setState] = useState<UseProposalWorkbenchDataResult>({
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
          error: toError(error, 'Failed to load proposal workbench.'),
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
