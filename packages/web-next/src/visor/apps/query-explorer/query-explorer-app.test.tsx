import type { OrganismWithState } from '@omnilith/api-contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../api/api-client.js';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { QueryExplorerApp } from './query-explorer-app.js';
import type { QueryExplorerAppRouteState } from './query-explorer-app-route.js';
import type { QueryExplorerData, QueryExplorerSectionErrors } from './use-query-explorer-data.js';

interface MockQueryExplorerState {
  readonly data: QueryExplorerData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly sectionErrors: QueryExplorerSectionErrors;
}

const EMPTY_SECTION_ERRORS: QueryExplorerSectionErrors = {
  results: null,
};

let mockState: MockQueryExplorerState = {
  data: null,
  loading: true,
  error: null,
  sectionErrors: EMPTY_SECTION_ERRORS,
};
let requestedRouteState: QueryExplorerAppRouteState | null = null;

vi.mock('./use-query-explorer-data.js', () => ({
  useQueryExplorerData: (routeState: QueryExplorerAppRouteState) => {
    requestedRouteState = routeState;
    return mockState;
  },
}));

function createOrganism(input: {
  id: string;
  name: string;
  createdBy: string;
  contentTypeId?: string;
}): OrganismWithState {
  return {
    organism: {
      id: input.id,
      name: input.name,
      createdAt: 1,
      createdBy: input.createdBy,
      openTrunk: false,
    },
    currentState: input.contentTypeId
      ? {
          id: `state-${input.id}`,
          organismId: input.id,
          contentTypeId: input.contentTypeId,
          payload: {},
          createdAt: 1,
          createdBy: input.createdBy,
          sequenceNumber: 1,
        }
      : undefined,
  };
}

describe('QueryExplorerApp', () => {
  beforeEach(() => {
    mockState = {
      data: null,
      loading: true,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };
    requestedRouteState = null;
  });

  it('shows loading status while query explorer data is loading', () => {
    const html = renderToStaticMarkup(
      createElement(QueryExplorerApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Loading query explorer...');
    expect(requestedRouteState?.targetedOrganismId).toBeNull();
  });

  it('renders result list and actions when ready', () => {
    mockState = {
      data: {
        targetOrganismId: 'boundary-1',
        organisms: [
          createOrganism({
            id: 'org-1',
            name: 'Alpha Organism',
            createdBy: 'user-1',
            contentTypeId: 'text',
          }),
          createOrganism({
            id: 'org-2',
            name: 'Beta Organism',
            createdBy: 'user-2',
            contentTypeId: 'image',
          }),
        ],
        filters: {
          query: '',
          contentTypeId: null,
          createdBy: null,
          limit: 25,
          offset: 0,
        },
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(QueryExplorerApp, {
        onRequestClose: () => {},
        organismId: 'boundary-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Query Explorer');
    expect(html).toContain('Alpha Organism');
    expect(html).toContain('Open Organism View');
    expect(requestedRouteState?.targetedOrganismId).toBe('boundary-1');
  });

  it('shows empty status when filters return no organisms', () => {
    mockState = {
      data: {
        targetOrganismId: null,
        organisms: [],
        filters: {
          query: 'missing',
          contentTypeId: null,
          createdBy: null,
          limit: 25,
          offset: 0,
        },
      },
      loading: false,
      error: null,
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(QueryExplorerApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('No organisms match the current filters.');
  });

  it('shows sign-in status when query endpoint requires authentication', () => {
    mockState = {
      data: null,
      loading: false,
      error: new ApiError(401, 'Unauthorized'),
      sectionErrors: EMPTY_SECTION_ERRORS,
    };

    const html = renderToStaticMarkup(
      createElement(QueryExplorerApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Sign in to run global organism queries.');
  });
});
