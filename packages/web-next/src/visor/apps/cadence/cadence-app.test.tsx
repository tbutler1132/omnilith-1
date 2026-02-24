import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CadenceApp } from './cadence-app.js';

interface MockCadenceState {
  readonly data: {
    readonly children: ReadonlyArray<{
      readonly childId: string;
      readonly name: string;
      readonly contentTypeId: string | null;
      readonly payload: unknown;
    }>;
  } | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

let mockCadenceState: MockCadenceState = {
  data: null,
  loading: false,
  error: null,
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
    };
    requestedOrganismId = null;
  });

  it('renders a guidance message when no organism is targeted', () => {
    const html = renderToStaticMarkup(
      createElement(CadenceApp, {
        onRequestClose: () => {},
        organismId: null,
      }),
    );

    expect(html).toContain('Enter an organism to view boundary cadence.');
    expect(requestedOrganismId).toBeNull();
  });

  it('renders cadence previews when cadence organisms are present', () => {
    mockCadenceState = {
      data: {
        children: [
          {
            childId: 'child-1',
            name: 'capital-community-variables',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Variables\n\n- Review sensor readings.',
              format: 'markdown',
            },
          },
          {
            childId: 'child-2',
            name: 'capital-community-load-sensor',
            contentTypeId: 'sensor',
            payload: {},
          },
        ],
      },
      loading: false,
      error: null,
    };

    const html = renderToStaticMarkup(
      createElement(CadenceApp, {
        onRequestClose: () => {},
        organismId: 'boundary-1',
      }),
    );

    expect(html).toContain('Boundary Cadence');
    expect(html).toContain('capital-community-variables');
    expect(html).toContain('Capital Community Variables');
    expect(requestedOrganismId).toBe('boundary-1');
  });
});
