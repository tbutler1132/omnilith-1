import type { FetchUserOrganismsResponse } from '@omnilith/api-contracts';
import { describe, expect, it } from 'vitest';
import {
  presentMapStudioCandidates,
  presentMapStudioStatus,
  resolveMapStudioPlacement,
} from './map-studio-presenter.js';

function createUserOrganism(input: {
  id: string;
  name: string;
  contentTypeId?: string;
}): FetchUserOrganismsResponse['organisms'][number] {
  return {
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
      : undefined,
  };
}

describe('presentMapStudioStatus', () => {
  it('returns auth-required when sign-in is needed', () => {
    expect(
      presentMapStudioStatus({
        loading: false,
        error: null,
        hasMapOrganism: true,
        isSpatialMapTarget: true,
        requiresSignIn: true,
        candidateCount: 3,
      }),
    ).toEqual({
      status: 'auth-required',
      message: 'Sign in to reposition your surfaced organisms on this map.',
    });
  });

  it('returns unsupported target when map is not spatial-map', () => {
    expect(
      presentMapStudioStatus({
        loading: false,
        error: null,
        hasMapOrganism: true,
        isSpatialMapTarget: false,
        requiresSignIn: false,
        candidateCount: 3,
      }),
    ).toEqual({
      status: 'unsupported-target',
      message: 'Map Studio requires a spatial-map target organism.',
    });
  });
});

describe('presentMapStudioCandidates', () => {
  it('returns my surfaced map entries while excluding map/self and local exclusions', () => {
    const result = presentMapStudioCandidates({
      organisms: [
        createUserOrganism({ id: 'org-c', name: 'C Lumen' }),
        createUserOrganism({ id: 'org-a', name: 'A Root', contentTypeId: 'text' }),
        createUserOrganism({ id: 'org-b', name: 'B Current', contentTypeId: 'image' }),
        createUserOrganism({ id: 'map-1', name: 'Boundary Map', contentTypeId: 'spatial-map' }),
      ],
      mapEntries: [
        { organismId: 'org-a', x: 10, y: 11 },
        { organismId: 'org-b', x: 12, y: 13 },
        { organismId: 'org-z', x: 20, y: 21 },
        { organismId: 'map-1', x: 30, y: 31 },
      ],
      excludedOrganismIds: new Set(['org-c']),
      mapOrganismId: 'map-1',
    });

    expect(result).toEqual([
      {
        id: 'org-a',
        name: 'A Root',
        contentTypeId: 'text',
        x: 10,
        y: 11,
      },
      {
        id: 'org-b',
        name: 'B Current',
        contentTypeId: 'image',
        x: 12,
        y: 13,
      },
    ]);
  });
});

describe('resolveMapStudioPlacement', () => {
  it('uses cursor placement when cursor telemetry is available', () => {
    expect(
      resolveMapStudioPlacement({
        cursorWorld: { x: 220.2, y: 119.8 },
      }),
    ).toEqual({
      x: 220,
      y: 120,
      source: 'cursor',
    });
  });

  it('returns null when cursor telemetry is unavailable', () => {
    expect(
      resolveMapStudioPlacement({
        cursorWorld: null,
      }),
    ).toBeNull();
  });
});
