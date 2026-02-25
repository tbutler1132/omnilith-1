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

interface MockMyOrganismsState {
  readonly organisms: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly contentTypeId: string | null;
  }>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly requiresSignIn: boolean;
}

let mockOverviewState: MockOverviewState = {
  data: null,
  loading: true,
  error: null,
};
let mockMyOrganismsState: MockMyOrganismsState = {
  organisms: [],
  loading: false,
  error: null,
  requiresSignIn: false,
};
let requestedOrganismId: string | null = null;
let requestedMyOrganismsEnabled = false;

vi.mock('./use-organism-overview.js', () => ({
  useOrganismOverview: (organismId: string | null) => {
    requestedOrganismId = organismId;
    return mockOverviewState;
  },
}));

vi.mock('./use-my-organisms.js', () => ({
  useMyOrganisms: (enabled: boolean) => {
    requestedMyOrganismsEnabled = enabled;
    return mockMyOrganismsState;
  },
}));

describe('OrganismApp', () => {
  beforeEach(() => {
    mockOverviewState = {
      data: null,
      loading: true,
      error: null,
    };
    mockMyOrganismsState = {
      organisms: [],
      loading: false,
      error: null,
      requiresSignIn: false,
    };
    requestedOrganismId = null;
    requestedMyOrganismsEnabled = false;
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

    const wireframeIndex = html.indexOf('<svg');
    const payloadIndex = html.indexOf('<pre');

    expect(wireframeIndex).toBeGreaterThan(-1);
    expect(payloadIndex).toBeGreaterThan(-1);
    expect(wireframeIndex).toBeLessThan(payloadIndex);
    expect(html).toContain('&quot;title&quot;: &quot;Field Note&quot;');
    expect(requestedOrganismId).toBe('org-1');
    expect(requestedMyOrganismsEnabled).toBe(false);
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

    expect(html).not.toContain('<svg');
    expect(html).toContain('Loading organism overview...');
  });

  it('renders user organisms when my organisms tab is active', () => {
    mockMyOrganismsState = {
      organisms: [
        { id: 'org-a', name: 'Practice Map', contentTypeId: 'spatial-map' },
        { id: 'org-b', name: 'Field Notes', contentTypeId: 'text' },
      ],
      loading: false,
      error: null,
      requiresSignIn: false,
    };

    const html = renderToStaticMarkup(
      createElement(OrganismApp, {
        onRequestClose: () => {},
        organismId: 'org-a',
        appRouteState: {
          tab: 'my-organisms',
          targetedOrganismId: 'org-a',
        },
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('My organisms');
    expect(html).toContain('Practice Map');
    expect(html).toContain('Field Notes');
    expect(requestedMyOrganismsEnabled).toBe(true);
  });
});
