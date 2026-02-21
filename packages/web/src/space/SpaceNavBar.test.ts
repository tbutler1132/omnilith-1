import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpaceNavBar } from './SpaceNavBar.js';

const mockState = vi.hoisted(() => ({
  mapState: {
    navigationStack: [{ mapId: 'map_world', label: 'World' }],
    currentMapId: 'map_world',
    focusedOrganismId: null as string | null,
    enteredOrganismId: null as string | null,
  },
  viewportMeta: {
    altitude: 'high',
  },
  visorState: {
    visorOrganismId: null as string | null,
  },
  namesById: {} as Record<string, string>,
  actions: {
    focusOrganism: vi.fn(),
    exitOrganism: vi.fn(),
    exitMap: vi.fn(),
  },
}));

const usePlatformVisorStateMock = vi.hoisted(() => vi.fn(() => mockState.visorState));

vi.mock('../platform/index.js', () => ({
  usePlatformMapState: () => mockState.mapState,
  usePlatformViewportMeta: () => mockState.viewportMeta,
  usePlatformActions: () => mockState.actions,
  usePlatformVisorState: usePlatformVisorStateMock,
}));

vi.mock('../hooks/use-organism.js', () => ({
  useOrganism: (organismId: string) => ({
    data: {
      organism: {
        name: mockState.namesById[organismId] ?? organismId,
      },
    },
  }),
}));

function renderNavBar() {
  return renderToStaticMarkup(createElement(SpaceNavBar));
}

describe('SpaceNavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.mapState.navigationStack = [{ mapId: 'map_world', label: 'World' }];
    mockState.mapState.currentMapId = 'map_world';
    mockState.mapState.focusedOrganismId = null;
    mockState.mapState.enteredOrganismId = null;
    mockState.viewportMeta.altitude = 'high';
    mockState.visorState.visorOrganismId = null;
    mockState.namesById = {};
  });

  it('keeps the interior location label while a visor organism is open', () => {
    mockState.mapState.enteredOrganismId = 'organism_inside';
    mockState.visorState.visorOrganismId = 'organism_visor';
    mockState.namesById = {
      organism_inside: 'Inside Organism',
      organism_visor: 'Visor Organism',
    };

    const html = renderNavBar();

    expect(html).toContain('Inside:');
    expect(html).toContain('Inside Organism');
    expect(html).not.toContain('In visor:');
    expect(usePlatformVisorStateMock).not.toHaveBeenCalled();
  });

  it('does not show a back affordance from visor state alone', () => {
    mockState.visorState.visorOrganismId = 'organism_visor';

    const html = renderNavBar();

    expect(html).toContain('Wide view');
    expect(html).not.toContain('space-nav-back-btn');
    expect(html).not.toContain('In visor:');
    expect(usePlatformVisorStateMock).not.toHaveBeenCalled();
  });
});
