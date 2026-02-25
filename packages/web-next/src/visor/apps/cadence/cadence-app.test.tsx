import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { CadenceApp } from './cadence-app.js';

interface MockCadenceState {
  readonly data: {
    readonly boundary: {
      readonly id: string;
      readonly name: string;
    };
    readonly children: ReadonlyArray<{
      readonly childId: string;
      readonly name: string;
      readonly openTrunk: boolean;
      readonly contentTypeId: string | null;
      readonly payload: unknown;
    }>;
  } | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
}

let mockCadenceState: MockCadenceState = {
  data: null,
  loading: false,
  error: null,
  reload: () => {},
};
let requestedOrganismId: string | null = null;

vi.mock('./use-boundary-cadence.js', () => ({
  useBoundaryCadence: (organismId: string | null) => {
    requestedOrganismId = organismId;
    return mockCadenceState;
  },
}));

describe('CadenceApp', () => {
  beforeEach(() => {
    mockCadenceState = {
      data: null,
      loading: false,
      error: null,
      reload: () => {},
    };
    requestedOrganismId = null;
  });

  it('renders a guidance message when no organism is targeted', () => {
    const html = renderToStaticMarkup(
      createElement(CadenceApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Enter an organism to view boundary cadence.');
    expect(requestedOrganismId).toBeNull();
  });

  it('renders cadence previews when cadence organisms are present', () => {
    mockCadenceState = {
      data: {
        boundary: {
          id: 'boundary-1',
          name: 'Dev Practice',
        },
        children: [
          {
            childId: 'child-1',
            name: 'capital-community-variables',
            openTrunk: true,
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Variables\n\n- Review sensor readings.',
              format: 'markdown',
            },
          },
          {
            childId: 'child-2',
            name: 'capital-community-load-sensor',
            openTrunk: true,
            contentTypeId: 'sensor',
            payload: {},
          },
        ],
      },
      loading: false,
      error: null,
      reload: () => {},
    };

    const html = renderToStaticMarkup(
      createElement(CadenceApp, {
        onRequestClose: () => {},
        organismId: 'boundary-1',
        personalOrganismId: 'boundary-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Boundary Cadence');
    expect(html).toContain('Looking at:');
    expect(html).toContain('Dev Practice');
    expect(html).toContain('(your personal organism)');
    expect(html).toContain('capital-community-variables');
    expect(html).toContain('Capital Community Variables');
    expect(html).toContain('Edit');
    expect(requestedOrganismId).toBe('boundary-1');
  });
});
