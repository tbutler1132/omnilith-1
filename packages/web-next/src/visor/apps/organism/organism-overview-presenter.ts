/**
 * Organism overview presenter.
 *
 * Keeps overview state mapping deterministic and testable so app UI can
 * stay small and focused on rendering.
 */

import { ApiError } from '../../../api/api-client.js';

export type OrganismOverviewStatus = 'loading' | 'auth-required' | 'error' | 'empty' | 'ready';

export interface PresentOrganismOverviewInput {
  readonly organismLoading: boolean;
  readonly organismError?: Error;
  readonly hasCurrentState: boolean;
  readonly payload: unknown;
}

export interface PresentOrganismOverviewResult {
  readonly status: OrganismOverviewStatus;
  readonly message: string;
  readonly rawPayload?: string;
}

function isAuthRequiredError(error: Error | undefined): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 401 || error.status === 403;
}

export function presentOrganismOverview(input: PresentOrganismOverviewInput): PresentOrganismOverviewResult {
  if (input.organismLoading) {
    return {
      status: 'loading',
      message: 'Loading organism overview...',
    };
  }

  if (isAuthRequiredError(input.organismError)) {
    return {
      status: 'auth-required',
      message: 'Log in to inspect this overview.',
    };
  }

  if (input.organismError) {
    return {
      status: 'error',
      message: input.organismError.message ?? 'Failed to load organism overview.',
    };
  }

  if (!input.hasCurrentState || input.payload === undefined) {
    return {
      status: 'empty',
      message: 'No current state payload to display.',
    };
  }

  try {
    const rawPayload = JSON.stringify(input.payload, null, 2);
    if (rawPayload === undefined) {
      return {
        status: 'empty',
        message: 'No current state payload to display.',
      };
    }

    return {
      status: 'ready',
      message: '',
      rawPayload,
    };
  } catch {
    return {
      status: 'error',
      message: 'Unable to render raw state payload.',
    };
  }
}
