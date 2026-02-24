import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { OrganismApp } from './organism-app.js';

interface MockOverviewState {
  readonly data: {
    readonly organism: {
      readonly id: string;
      readonly name: string;
    };
    readonly currentState: {
      readonly contentTypeId: string;
      readonly payload: unknown;
    } | null;
  } | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

let mockOverviewState: MockOverviewState = {
  data: null,
  loading: true,
  error: null,
};
let requestedOrganismId: string | null = null;

vi.mock('./use-organism-overview.js', () => ({
  useOrganismOverview: (organismId: string | null) => {
    requestedOrganismId = organismId;
    return mockOverviewState;
  },
}));

describe('OrganismApp', () => {
  beforeEach(() => {
    mockOverviewState = {
      data: null,
      loading: true,
      error: null,
    };
    requestedOrganismId = null;
  });

  it('shows wireframe preview above raw payload when state is ready', () => {
    mockOverviewState = {
      data: {
        organism: {
          id: 'org-1',
          name: 'Boundary Organism',
        },
        currentState: {
          contentTypeId: 'text',
          payload: {
            title: 'Field Note',
            content: 'Inside the boundary.',
          },
        },
      },
      loading: false,
      error: null,
    };

    const html = renderToStaticMarkup(
      createElement(OrganismApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    const wireframeIndex = html.indexOf('organism-wireframe-panel');
    const payloadIndex = html.indexOf('organism-overview-payload');

    expect(wireframeIndex).toBeGreaterThan(-1);
    expect(payloadIndex).toBeGreaterThan(-1);
    expect(wireframeIndex).toBeLessThan(payloadIndex);
    expect(html).toContain('&quot;title&quot;: &quot;Field Note&quot;');
    expect(requestedOrganismId).toBe('org-1');
  });

  it('keeps preview hidden when overview is not ready', () => {
    const html = renderToStaticMarkup(
      createElement(OrganismApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).not.toContain('organism-wireframe-panel');
    expect(html).toContain('Loading organism overview...');
  });
});
