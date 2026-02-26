import type { Proposal } from '@omnilith/api-contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { ProposalWorkbenchApp } from './proposal-workbench-app.js';
import type { ProposalWorkbenchData, ProposalWorkbenchSectionErrors } from './use-proposal-workbench-data.js';

interface MockProposalWorkbenchState {
  readonly data: ProposalWorkbenchData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: ProposalWorkbenchSectionErrors;
}

const EMPTY_SECTION_ERRORS: ProposalWorkbenchSectionErrors = {
  proposals: null,
};

let mockState: MockProposalWorkbenchState = {
  data: null,
  loading: true,
  error: null,
  sectionErrors: EMPTY_SECTION_ERRORS,
};
let requestedTargetOrganismId: string | null = null;

vi.mock('./use-proposal-workbench-data.js', () => ({
  useProposalWorkbenchData: (targetedOrganismId: string | null) => {
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

describe('ProposalWorkbenchApp', () => {
  beforeEach(() => {
    mockState = {
      data: null,
      loading: true,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };
    requestedTargetOrganismId = null;
  });

  it('shows loading status while workbench data is loading', () => {
    const html = renderToStaticMarkup(
      createElement(ProposalWorkbenchApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Loading proposal workbench...');
    expect(requestedTargetOrganismId).toBeNull();
  });

  it('renders inbox list for open proposals by default', () => {
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
            id: 'proposal-declined',
            status: 'declined',
            createdAt: 1000,
            mutation: {
              kind: 'append-state',
              contentTypeId: 'text',
              payload: { content: 'declined proposal' },
            },
          }),
        ],
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(ProposalWorkbenchApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Proposal Workbench');
    expect(html).toContain('Boundary Organism');
    expect(html).toContain('proposal-open');
    expect(html).not.toContain('proposal-declined');
    expect(html).toContain('Open 1');
    expect(requestedTargetOrganismId).toBe('org-1');
  });

  it('renders detail compare for selected proposal', () => {
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
      createElement(ProposalWorkbenchApp, {
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

    expect(html).toContain('Back to inbox');
    expect(html).toContain('Compare mode: raw JSON');
    expect(html).toContain('&quot;content&quot;: &quot;before state&quot;');
    expect(html).toContain('&quot;content&quot;: &quot;after state&quot;');
  });
});
