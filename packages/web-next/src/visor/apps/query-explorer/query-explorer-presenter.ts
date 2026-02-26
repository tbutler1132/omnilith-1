/**
 * Query Explorer presenter.
 *
 * Normalizes fetch status and result projection so the app can focus on
 * filter interaction and retrieval rendering.
 */

import type { OrganismWithState } from '@omnilith/api-contracts';
import { ApiError } from '../../../api/api-client.js';

export type QueryExplorerStatus = 'loading' | 'auth-required' | 'error' | 'empty' | 'ready';

export interface PresentQueryExplorerStatusInput {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly resultCount: number;
}

export interface PresentQueryExplorerStatusResult {
  readonly status: QueryExplorerStatus;
  readonly message: string;
}

export interface PresentQueryExplorerResultsInput {
  readonly organisms: ReadonlyArray<OrganismWithState>;
  readonly selectedOrganismId: string | null;
}

export interface PresentedQueryExplorerEntry {
  readonly id: string;
  readonly name: string;
  readonly createdBy: string;
  readonly contentTypeId: string;
  readonly openTrunk: boolean;
  readonly isSelected: boolean;
}

export interface PresentQueryExplorerResultsResult {
  readonly entries: ReadonlyArray<PresentedQueryExplorerEntry>;
  readonly selectedOrganismId: string | null;
  readonly totalCount: number;
}

function isAuthRequiredError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return error.status === 401 || error.status === 403;
}

export function presentQueryExplorerStatus(input: PresentQueryExplorerStatusInput): PresentQueryExplorerStatusResult {
  if (input.loading) {
    return {
      status: 'loading',
      message: 'Loading query explorer...',
    };
  }

  if (isAuthRequiredError(input.error)) {
    return {
      status: 'auth-required',
      message: 'Sign in to run global organism queries.',
    };
  }

  if (input.error) {
    return {
      status: 'error',
      message: input.error.message ?? 'Failed to load query explorer.',
    };
  }

  if (input.resultCount === 0) {
    return {
      status: 'empty',
      message: 'No organisms match the current filters.',
    };
  }

  return {
    status: 'ready',
    message: '',
  };
}

export function presentQueryExplorerResults(
  input: PresentQueryExplorerResultsInput,
): PresentQueryExplorerResultsResult {
  const baseEntries = input.organisms.map((entry) => ({
    id: entry.organism.id,
    name: entry.organism.name,
    createdBy: entry.organism.createdBy,
    contentTypeId: entry.currentState?.contentTypeId ?? 'unknown',
    openTrunk: entry.organism.openTrunk,
  }));

  const selectedOrganismId = resolveSelectedOrganismId(baseEntries, input.selectedOrganismId);
  const entries: ReadonlyArray<PresentedQueryExplorerEntry> = baseEntries.map((entry) => ({
    ...entry,
    isSelected: entry.id === selectedOrganismId,
  }));

  return {
    entries,
    selectedOrganismId,
    totalCount: entries.length,
  };
}

function resolveSelectedOrganismId(
  entries: ReadonlyArray<{ readonly id: string }>,
  selectedOrganismId: string | null,
): string | null {
  if (selectedOrganismId && entries.some((entry) => entry.id === selectedOrganismId)) {
    return selectedOrganismId;
  }

  return entries[0]?.id ?? null;
}
