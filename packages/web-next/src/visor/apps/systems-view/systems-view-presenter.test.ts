import type { ChildWithStateRecord, FetchOrganismResponse, FetchParentResponse } from '@omnilith/api-contracts';
import { describe, expect, it } from 'vitest';
import { presentSystemsViewStatus, presentSystemsViewStructure } from './systems-view-presenter.js';

function createChild(input: {
  id: string;
  name: string;
  position?: number;
  composedAt?: number;
  contentTypeId?: string;
}): ChildWithStateRecord {
  return {
    composition: {
      parentId: 'org-parent',
      childId: input.id,
      composedAt: input.composedAt ?? Date.now(),
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

describe('presentSystemsViewStatus', () => {
  it('returns loading while systems view is loading', () => {
    expect(
      presentSystemsViewStatus({
        loading: true,
        error: null,
        hasOrganism: false,
      }),
    ).toEqual({
      status: 'loading',
      message: 'Loading systems view...',
    });
  });

  it('returns ready when organism context exists', () => {
    expect(
      presentSystemsViewStatus({
        loading: false,
        error: null,
        hasOrganism: true,
      }),
    ).toEqual({
      status: 'ready',
      message: '',
    });
  });
});

describe('presentSystemsViewStructure', () => {
  it('sorts children by composition position', () => {
    const organism: FetchOrganismResponse['organism'] = {
      id: 'org-target',
      name: 'Target Boundary',
      openTrunk: false,
    };
    const parent: FetchParentResponse['parent'] = {
      parentId: 'org-parent',
      childId: 'org-target',
      composedAt: 10,
      composedBy: 'user-1',
    };

    const result = presentSystemsViewStructure({
      organism,
      currentState: {
        contentTypeId: 'text',
        payload: {},
      },
      parent,
      children: [
        createChild({ id: 'child-2', name: 'Child Two', position: 2 }),
        createChild({ id: 'child-1', name: 'Child One', position: 1 }),
      ],
      selectedChildId: null,
    });

    expect(result.children.map((child) => child.id)).toEqual(['child-1', 'child-2']);
    expect(result.selectedChildId).toBe('child-1');
  });

  it('keeps selected child when it still exists', () => {
    const result = presentSystemsViewStructure({
      organism: {
        id: 'org-target',
        name: 'Target Boundary',
        openTrunk: true,
      },
      currentState: {
        contentTypeId: 'spatial-map',
        payload: {},
      },
      parent: null,
      children: [
        createChild({ id: 'child-a', name: 'Child A', position: 1, contentTypeId: 'text' }),
        createChild({ id: 'child-b', name: 'Child B', position: 2, contentTypeId: 'image' }),
      ],
      selectedChildId: 'child-b',
    });

    expect(result.selectedChildId).toBe('child-b');
    expect(result.children.find((child) => child.id === 'child-b')?.isSelected).toBe(true);
  });
});
