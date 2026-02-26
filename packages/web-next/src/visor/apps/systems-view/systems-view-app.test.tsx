import type { ChildWithStateRecord } from '@omnilith/api-contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { SystemsViewApp } from './systems-view-app.js';
import type { SystemsViewData, SystemsViewSectionErrors } from './use-systems-view-data.js';

interface MockSystemsViewState {
  readonly data: SystemsViewData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: SystemsViewSectionErrors;
}

const EMPTY_SECTION_ERRORS: SystemsViewSectionErrors = {
  composition: null,
};

let mockState: MockSystemsViewState = {
  data: null,
  loading: true,
  error: null,
  sectionErrors: EMPTY_SECTION_ERRORS,
};
let requestedTargetOrganismId: string | null = null;

vi.mock('./use-systems-view-data.js', () => ({
  useSystemsViewData: (targetedOrganismId: string | null) => {
    requestedTargetOrganismId = targetedOrganismId;
    return mockState;
  },
}));

function createChild(input: {
  id: string;
  name: string;
  position?: number;
  contentTypeId?: string;
}): ChildWithStateRecord {
  return {
    composition: {
      parentId: 'org-1',
      childId: input.id,
      composedAt: 1700000000000,
      composedBy: 'user-1',
      position: input.position,
    },
    organism: {
      id: input.id,
      name: input.name,
      createdAt: 1,
      createdBy: 'user-1',
      openTrunk: false,
    },
    currentState: input.contentTypeId
      ? {
          id: `state-${input.id}`,
          organismId: input.id,
          contentTypeId: input.contentTypeId,
          payload: {},
          createdAt: 2,
          createdBy: 'user-1',
          sequenceNumber: 1,
        }
      : null,
  };
}

describe('SystemsViewApp', () => {
  beforeEach(() => {
    mockState = {
      data: null,
      loading: true,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };
    requestedTargetOrganismId = null;
  });

  it('shows loading status while systems data is loading', () => {
    const html = renderToStaticMarkup(
      createElement(SystemsViewApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Loading systems view...');
    expect(requestedTargetOrganismId).toBeNull();
  });

  it('renders parent, target, and child lanes', () => {
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
          payload: { content: 'state' },
        },
        parent: {
          parentId: 'org-parent',
          childId: 'org-1',
          composedAt: 1,
          composedBy: 'user-1',
        },
        children: [
          createChild({ id: 'child-1', name: 'Child One', position: 1, contentTypeId: 'text' }),
          createChild({ id: 'child-2', name: 'Child Two', position: 2, contentTypeId: 'image' }),
        ],
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(SystemsViewApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Systems View');
    expect(html).toContain('Parent Boundary');
    expect(html).toContain('Target Boundary');
    expect(html).toContain('Composed Children');
    expect(html).toContain('Child One');
    expect(html).toContain('Focus child');
    expect(requestedTargetOrganismId).toBe('org-1');
  });

  it('highlights selected child from route state', () => {
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
          payload: { content: 'state' },
        },
        parent: null,
        children: [
          createChild({ id: 'child-1', name: 'Child One', position: 1, contentTypeId: 'text' }),
          createChild({ id: 'child-2', name: 'Child Two', position: 2, contentTypeId: 'image' }),
        ],
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(SystemsViewApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        appRouteState: {
          targetedOrganismId: 'org-1',
          selectedChildId: 'child-2',
        },
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Selected');
    expect(html).toContain('Child Two');
  });
});
