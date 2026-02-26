import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { OrganismViewApp } from './organism-view-app.js';
import type { OrganismViewData, OrganismViewSectionErrors } from './use-organism-view-data.js';

interface MockOrganismViewState {
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

let mockState: MockOrganismViewState = {
  data: null,
  loading: true,
  error: null,
  sectionErrors: EMPTY_SECTION_ERRORS,
};
let requestedTargetOrganismId: string | null = null;

vi.mock('./use-organism-view-data.js', () => ({
  useOrganismViewData: (targetedOrganismId: string | null) => {
    requestedTargetOrganismId = targetedOrganismId;
    return mockState;
  },
}));

describe('OrganismViewApp', () => {
  beforeEach(() => {
    mockState = {
      data: null,
      loading: true,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };
    requestedTargetOrganismId = null;
  });

  it('shows loading status before organism data is ready', () => {
    const html = renderToStaticMarkup(
      createElement(OrganismViewApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Loading organism view...');
    expect(requestedTargetOrganismId).toBeNull();
  });

  it('renders state tab with raw payload when current state exists', () => {
    mockState = {
      data: {
        targetOrganismId: 'org-1',
        organism: {
          id: 'org-1',
          name: 'Boundary Organism',
          openTrunk: true,
        },
        currentState: {
          contentTypeId: 'text',
          payload: {
            title: 'Field Note',
            content: 'Inside the boundary.',
          },
        },
        stateHistory: [
          {
            id: 'state-1',
            organismId: 'org-1',
            contentTypeId: 'text',
            payload: { content: 'Inside the boundary.' },
            createdAt: 1700000000000,
            createdBy: 'user-1',
            sequenceNumber: 1,
          },
        ],
        parent: null,
        children: [],
        visibility: {
          organismId: 'org-1',
          level: 'members',
          updatedAt: 1700000000000,
        },
        proposalCount: 3,
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(OrganismViewApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Organism View');
    expect(html).toContain('Looking at:');
    expect(html).toContain('Boundary Organism');
    expect(html).toContain('&quot;title&quot;: &quot;Field Note&quot;');
    expect(requestedTargetOrganismId).toBe('org-1');
  });

  it('renders composition tab with parent and children', () => {
    mockState = {
      data: {
        targetOrganismId: 'org-parent',
        organism: {
          id: 'org-parent',
          name: 'Parent Boundary',
          openTrunk: false,
        },
        currentState: null,
        stateHistory: [],
        parent: {
          parentId: 'org-root',
          childId: 'org-parent',
          composedAt: 1700000000000,
          composedBy: 'user-1',
          position: 2,
        },
        children: [
          {
            composition: {
              parentId: 'org-parent',
              childId: 'org-child',
              composedAt: 1700000000100,
              composedBy: 'user-1',
              position: 1,
            },
            organism: {
              id: 'org-child',
              name: 'Child Organism',
              createdAt: 1700000000000,
              createdBy: 'user-1',
              openTrunk: true,
            },
            currentState: {
              id: 'state-child',
              organismId: 'org-child',
              contentTypeId: 'text',
              payload: { content: 'child payload' },
              createdAt: 1700000000000,
              createdBy: 'user-1',
              sequenceNumber: 1,
            },
          },
        ],
        visibility: null,
        proposalCount: 0,
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(OrganismViewApp, {
        onRequestClose: () => {},
        organismId: 'org-parent',
        appRouteState: {
          tab: 'composition',
          targetedOrganismId: 'org-parent',
        },
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Parent');
    expect(html).toContain('org-root');
    expect(html).toContain('Child Organism');
    expect(html).toContain('Open child');
  });
});
