import type { OrganismWithState } from '@omnilith/api-contracts';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../api/api-client.js';
import { presentQueryExplorerResults, presentQueryExplorerStatus } from './query-explorer-presenter.js';

function createOrganismWithState(input: {
  id: string;
  name: string;
  createdBy: string;
  openTrunk?: boolean;
  contentTypeId?: string;
}): OrganismWithState {
  return {
    organism: {
      id: input.id,
      name: input.name,
      createdAt: 1,
      createdBy: input.createdBy,
      openTrunk: input.openTrunk ?? false,
    },
    currentState: input.contentTypeId
      ? {
          id: `state-${input.id}`,
          organismId: input.id,
          contentTypeId: input.contentTypeId,
          payload: {},
          createdAt: 2,
          createdBy: input.createdBy,
          sequenceNumber: 1,
        }
      : undefined,
  };
}

describe('presentQueryExplorerStatus', () => {
  it('returns loading while query explorer is loading', () => {
    expect(
      presentQueryExplorerStatus({
        loading: true,
        error: null,
        resultCount: 0,
      }),
    ).toEqual({
      status: 'loading',
      message: 'Loading query explorer...',
    });
  });

  it('returns auth-required for unauthorized access', () => {
    expect(
      presentQueryExplorerStatus({
        loading: false,
        error: new ApiError(401, 'Unauthorized'),
        resultCount: 0,
      }),
    ).toEqual({
      status: 'auth-required',
      message: 'Sign in to run global organism queries.',
    });
  });

  it('returns empty when no results are present', () => {
    expect(
      presentQueryExplorerStatus({
        loading: false,
        error: null,
        resultCount: 0,
      }),
    ).toEqual({
      status: 'empty',
      message: 'No organisms match the current filters.',
    });
  });

  it('returns ready when results are present', () => {
    expect(
      presentQueryExplorerStatus({
        loading: false,
        error: null,
        resultCount: 2,
      }),
    ).toEqual({
      status: 'ready',
      message: '',
    });
  });
});

describe('presentQueryExplorerResults', () => {
  it('selects the first result when no selected id is provided', () => {
    const result = presentQueryExplorerResults({
      organisms: [
        createOrganismWithState({
          id: 'org-1',
          name: 'Alpha',
          createdBy: 'user-1',
          contentTypeId: 'text',
        }),
        createOrganismWithState({
          id: 'org-2',
          name: 'Beta',
          createdBy: 'user-2',
          contentTypeId: 'image',
        }),
      ],
      selectedOrganismId: null,
    });

    expect(result.selectedOrganismId).toBe('org-1');
    expect(result.entries[0]?.isSelected).toBe(true);
    expect(result.entries[1]?.isSelected).toBe(false);
  });

  it('falls back to unknown content type when current state is missing', () => {
    const result = presentQueryExplorerResults({
      organisms: [
        createOrganismWithState({
          id: 'org-1',
          name: 'Gamma',
          createdBy: 'user-3',
        }),
      ],
      selectedOrganismId: 'org-1',
    });

    expect(result.entries[0]?.contentTypeId).toBe('unknown');
    expect(result.entries[0]?.isSelected).toBe(true);
  });
});
