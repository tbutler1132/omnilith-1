import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { MapStudioApp } from './map-studio-app.js';
import type { MapStudioData, MapStudioSectionErrors } from './use-map-studio-data.js';

interface MockMapStudioState {
  readonly data: MapStudioData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly requiresSignIn: boolean;
  readonly sectionErrors: MapStudioSectionErrors;
}

const EMPTY_SECTION_ERRORS: MapStudioSectionErrors = {
  candidates: null,
};

let mockState: MockMapStudioState = {
  data: null,
  loading: true,
  error: null,
  requiresSignIn: false,
  sectionErrors: EMPTY_SECTION_ERRORS,
};
let requestedTargetMapId: string | null = null;

vi.mock('./use-map-studio-data.js', () => ({
  useMapStudioData: (targetMapId: string | null) => {
    requestedTargetMapId = targetMapId;
    return mockState;
  },
}));

describe('MapStudioApp', () => {
  beforeEach(() => {
    mockState = {
      data: null,
      loading: true,
      error: null,
      requiresSignIn: false,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };
    requestedTargetMapId = null;
  });

  it('shows loading status while map studio data is loading', () => {
    const html = renderToStaticMarkup(
      createElement(MapStudioApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Loading map studio...');
    expect(requestedTargetMapId).toBeNull();
  });

  it('renders candidate list and surfacing action when ready', () => {
    mockState = {
      data: {
        targetMapId: 'map-ctx',
        mapOrganism: {
          id: 'map-ctx',
          name: 'World Map',
          openTrunk: true,
        },
        mapState: {
          contentTypeId: 'spatial-map',
          payload: {},
        },
        mapSize: {
          width: 5000,
          height: 5000,
        },
        mapEntries: [{ organismId: 'surfaced-1', x: 100, y: 200 }],
        myOrganisms: [
          {
            organism: {
              id: 'org-1',
              name: 'Alpha Organism',
              createdAt: 1,
              createdBy: 'user-1',
              openTrunk: false,
            },
            currentState: {
              id: 'state-1',
              organismId: 'org-1',
              contentTypeId: 'text',
              payload: {},
              createdAt: 1,
              createdBy: 'user-1',
              sequenceNumber: 1,
            },
          },
        ],
      },
      loading: false,
      error: null,
      requiresSignIn: false,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(MapStudioApp, {
        onRequestClose: () => {},
        organismId: 'map-route',
        spatialContext: {
          ...createEmptySpatialContext(),
          mapOrganismId: 'map-ctx',
          mapSize: { width: 5000, height: 5000 },
          cursorWorld: { x: 310, y: 920 },
        },
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Map Studio');
    expect(html).toContain('World Map');
    expect(html).toContain('Alpha Organism');
    expect(html).toContain('Surface onto map');
    expect(requestedTargetMapId).toBe('map-ctx');
  });

  it('shows sign-in status when candidate data requires authentication', () => {
    mockState = {
      data: {
        targetMapId: 'map-ctx',
        mapOrganism: {
          id: 'map-ctx',
          name: 'World Map',
          openTrunk: true,
        },
        mapState: {
          contentTypeId: 'spatial-map',
          payload: {},
        },
        mapSize: {
          width: 5000,
          height: 5000,
        },
        mapEntries: [],
        myOrganisms: [],
      },
      loading: false,
      error: null,
      requiresSignIn: true,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(MapStudioApp, {
        onRequestClose: () => {},
        organismId: 'map-ctx',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Sign in to surface your organisms onto this map.');
  });

  it('shows unsupported status when target is not a spatial-map', () => {
    mockState = {
      data: {
        targetMapId: 'org-regular',
        mapOrganism: {
          id: 'org-regular',
          name: 'Regular Organism',
          openTrunk: false,
        },
        mapState: {
          contentTypeId: 'text',
          payload: {},
        },
        mapSize: {
          width: 5000,
          height: 5000,
        },
        mapEntries: [],
        myOrganisms: [],
      },
      loading: false,
      error: null,
      requiresSignIn: false,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(MapStudioApp, {
        onRequestClose: () => {},
        organismId: 'org-regular',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Map Studio requires a spatial-map target organism.');
  });

  it('requires explicit cursor placement before surfacing', () => {
    mockState = {
      data: {
        targetMapId: 'map-ctx',
        mapOrganism: {
          id: 'map-ctx',
          name: 'World Map',
          openTrunk: true,
        },
        mapState: {
          contentTypeId: 'spatial-map',
          payload: {},
        },
        mapSize: {
          width: 5000,
          height: 5000,
        },
        mapEntries: [],
        myOrganisms: [
          {
            organism: {
              id: 'org-1',
              name: 'Alpha Organism',
              createdAt: 1,
              createdBy: 'user-1',
              openTrunk: false,
            },
            currentState: {
              id: 'state-1',
              organismId: 'org-1',
              contentTypeId: 'text',
              payload: {},
              createdAt: 1,
              createdBy: 'user-1',
              sequenceNumber: 1,
            },
          },
        ],
      },
      loading: false,
      error: null,
      requiresSignIn: false,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(MapStudioApp, {
        onRequestClose: () => {},
        organismId: 'map-ctx',
        spatialContext: {
          ...createEmptySpatialContext(),
          mapOrganismId: 'map-ctx',
          mapSize: { width: 5000, height: 5000 },
          cursorWorld: null,
        },
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Pick a map spot with your cursor.');
    expect(html).toContain('Pick map spot first');
    expect(html).toContain('disabled');
  });
});
