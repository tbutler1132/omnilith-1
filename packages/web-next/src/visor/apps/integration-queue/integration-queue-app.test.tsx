import type { Proposal } from '@omnilith/api-contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { IntegrationQueueApp } from './integration-queue-app.js';
import type { IntegrationQueueData, IntegrationQueueSectionErrors } from './use-integration-queue-data.js';

interface MockIntegrationQueueState {
  readonly data: IntegrationQueueData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: IntegrationQueueSectionErrors;
}

const EMPTY_SECTION_ERRORS: IntegrationQueueSectionErrors = {
  proposals: null,
};

let mockState: MockIntegrationQueueState = {
  data: null,
  loading: true,
  error: null,
  sectionErrors: EMPTY_SECTION_ERRORS,
};
let requestedTargetOrganismId: string | null = null;

vi.mock('./use-integration-queue-data.js', () => ({
  useIntegrationQueueData: (targetedOrganismId: string | null) => {
    requestedTargetOrganismId = targetedOrganismId;
    return mockState;
  },
}));

function createProposal(input: {
  id: string;
  status: Proposal['status'];
  createdAt: number;
  mutation: Proposal['mutation'];
}): Proposal {
  return {
    id: input.id,
    organismId: 'org-1',
    mutation: input.mutation,
    proposedContentTypeId: 'text',
    proposedPayload: { content: `proposed-${input.id}` },
    proposedBy: 'user-1',
    status: input.status,
    createdAt: input.createdAt,
  };
}

describe('IntegrationQueueApp', () => {
  beforeEach(() => {
    mockState = {
      data: null,
      loading: true,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };
    requestedTargetOrganismId = null;
  });

  it('shows loading status while queue data is loading', () => {
    const html = renderToStaticMarkup(
      createElement(IntegrationQueueApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Loading integration queue...');
    expect(requestedTargetOrganismId).toBeNull();
  });

  it('renders queue list for open proposals by default', () => {
    mockState = {
      data: {
        targetOrganismId: 'org-1',
        organism: {
          id: 'org-1',
          name: 'Boundary Organism',
          openTrunk: false,
        },
        currentState: {
          contentTypeId: 'text',
          payload: { content: 'before state' },
        },
        proposals: [
          createProposal({
            id: 'proposal-open',
            status: 'open',
            createdAt: 2000,
            mutation: {
              kind: 'append-state',
              contentTypeId: 'text',
              payload: { content: 'open proposal' },
            },
          }),
          createProposal({
            id: 'proposal-integrated',
            status: 'integrated',
            createdAt: 1000,
            mutation: {
              kind: 'append-state',
              contentTypeId: 'text',
              payload: { content: 'integrated proposal' },
            },
          }),
        ],
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(IntegrationQueueApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Integration Queue');
    expect(html).toContain('Boundary Organism');
    expect(html).toContain('proposal-open');
    expect(html).not.toContain('proposal-integrated');
    expect(html).toContain('Open 1');
    expect(requestedTargetOrganismId).toBe('org-1');
  });

  it('renders detail compare and actions for an open proposal', () => {
    mockState = {
      data: {
        targetOrganismId: 'org-1',
        organism: {
          id: 'org-1',
          name: 'Boundary Organism',
          openTrunk: false,
        },
        currentState: {
          contentTypeId: 'text',
          payload: { content: 'before state' },
        },
        proposals: [
          createProposal({
            id: 'proposal-1',
            status: 'open',
            createdAt: 2000,
            mutation: {
              kind: 'append-state',
              contentTypeId: 'text',
              payload: { content: 'after state' },
            },
          }),
        ],
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(IntegrationQueueApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        appRouteState: {
          tab: 'detail',
          statusFilter: 'all',
          selectedProposalId: 'proposal-1',
          targetedOrganismId: 'org-1',
        },
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Back to queue');
    expect(html).toContain('Integrate');
    expect(html).toContain('Decline');
    expect(html).toContain('Compare mode: raw JSON');
    expect(html).toContain('&quot;content&quot;: &quot;before state&quot;');
    expect(html).toContain('&quot;content&quot;: &quot;after state&quot;');
  });
});
