import { describe, expect, it } from 'vitest';
import {
  computeNextAdaptiveVisorLayout,
  createAdaptiveVisorCompositorState,
  deriveAdaptiveVisorContext,
  selectActiveMapPanel,
} from './adaptive-visor-compositor.js';

function createContext(input?: {
  visorOrganismId?: string | null;
  enteredOrganismId?: string | null;
  focusedOrganismId?: string | null;
}) {
  return deriveAdaptiveVisorContext({
    visorOrganismId: input?.visorOrganismId ?? null,
    enteredOrganismId: input?.enteredOrganismId ?? null,
    focusedOrganismId: input?.focusedOrganismId ?? null,
    altitude: 'high',
  });
}

describe('adaptive visor compositor', () => {
  it('a map context exposes map actions with no major panel selected', () => {
    const state = createAdaptiveVisorCompositorState(true, createContext());

    expect(state.activeWidgets).toEqual(['map-actions', 'history-navigation', 'compass', 'map-legend']);
    expect(state.activePanels).toEqual([]);
  });

  it('a visor organism context activates the visor view panel', () => {
    const state = createAdaptiveVisorCompositorState(
      true,
      createContext({ visorOrganismId: 'organism-1', enteredOrganismId: null }),
    );

    expect(state.activePanels).toEqual(['visor-view']);
    expect(state.activeWidgets).toEqual(['history-navigation', 'vitality']);
  });

  it('canonical events transition context across map, interior, and visor-organism deterministically', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext());
    const focused = computeNextAdaptiveVisorLayout(initialState, { type: 'focus-organism', organismId: 'organism-a' });
    const entered = computeNextAdaptiveVisorLayout(focused, { type: 'enter-organism', organismId: 'organism-a' });
    const visorOpened = computeNextAdaptiveVisorLayout(entered, {
      type: 'open-visor-organism',
      organismId: 'organism-b',
    });
    const visorClosed = computeNextAdaptiveVisorLayout(visorOpened, { type: 'close-visor-organism' });
    const exited = computeNextAdaptiveVisorLayout(visorClosed, { type: 'exit-organism' });
    const mapReset = computeNextAdaptiveVisorLayout(exited, { type: 'enter-map' });

    expect(focused.layoutContext.contextClass).toBe('map');
    expect(focused.focusedOrganismId).toBe('organism-a');

    expect(entered.layoutContext.contextClass).toBe('interior');
    expect(entered.spatialLocation).toBe('interior');
    expect(entered.enteredOrganismId).toBe('organism-a');
    expect(entered.activePanels).toEqual(['interior-actions']);

    expect(visorOpened.layoutContext.contextClass).toBe('visor-organism');
    expect(visorOpened.visorOrganismId).toBe('organism-b');
    expect(visorOpened.enteredOrganismId).toBe('organism-a');
    expect(visorOpened.activePanels).toEqual(['visor-view']);

    expect(visorClosed.layoutContext.contextClass).toBe('interior');
    expect(visorClosed.visorOrganismId).toBeNull();
    expect(visorClosed.activePanels).toEqual(['interior-actions']);

    expect(exited.layoutContext.contextClass).toBe('map');
    expect(exited.spatialLocation).toBe('map');
    expect(exited.enteredOrganismId).toBeNull();

    expect(mapReset.layoutContext.contextClass).toBe('map');
    expect(mapReset.focusedOrganismId).toBeNull();
    expect(mapReset.enteredOrganismId).toBeNull();
    expect(mapReset.visorOrganismId).toBeNull();
  });

  it('set-altitude updates canonical altitude and derived context altitude', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext());
    const nextState = computeNextAdaptiveVisorLayout(initialState, { type: 'set-altitude', altitude: 'mid' });

    expect(nextState.altitude).toBe('mid');
    expect(nextState.layoutContext.altitude).toBe('mid');
  });

  it('toggling a map panel opens and closes it deterministically', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext());
    const opened = computeNextAdaptiveVisorLayout(initialState, { type: 'toggle-map-panel', panelId: 'profile' });
    const closed = computeNextAdaptiveVisorLayout(opened, { type: 'toggle-map-panel', panelId: 'profile' });

    expect(selectActiveMapPanel(opened)).toBe('profile');
    expect(selectActiveMapPanel(closed)).toBeNull();
  });

  it('leaving map context and returning restores the prior map panel when unchanged', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext());
    const profile = computeNextAdaptiveVisorLayout(initialState, { type: 'toggle-map-panel', panelId: 'profile' });
    const visor = computeNextAdaptiveVisorLayout(profile, {
      type: 'open-visor-organism',
      organismId: 'organism-2',
    });
    const restored = computeNextAdaptiveVisorLayout(visor, { type: 'close-visor-organism' });

    expect(selectActiveMapPanel(profile)).toBe('profile');
    expect(selectActiveMapPanel(restored)).toBe('profile');
  });

  it('a mutation token bump forces recompute instead of restoring a map panel', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext());
    const profile = computeNextAdaptiveVisorLayout(initialState, { type: 'toggle-map-panel', panelId: 'profile' });
    const visor = computeNextAdaptiveVisorLayout(profile, {
      type: 'open-visor-organism',
      organismId: 'organism-2',
    });
    const mutated = computeNextAdaptiveVisorLayout(visor, { type: 'mutation' });
    const recomputed = computeNextAdaptiveVisorLayout(mutated, { type: 'close-visor-organism' });

    expect(selectActiveMapPanel(recomputed)).toBeNull();
    expect(recomputed.activeWidgets).toEqual(['map-actions', 'history-navigation', 'compass', 'map-legend']);
  });

  it('anchors remain available after context transitions and mutation events', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext());
    const toggled = computeNextAdaptiveVisorLayout(initialState, { type: 'toggle-map-panel', panelId: 'my-proposals' });
    const changedContext = computeNextAdaptiveVisorLayout(toggled, {
      type: 'open-visor-organism',
      organismId: 'organism-2',
    });
    const mutated = computeNextAdaptiveVisorLayout(changedContext, { type: 'mutation' });

    expect(mutated.anchors).toEqual(['navigation-back', 'dismiss']);
  });

  it('records event to decision to layout traces when trace mode is enabled', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext(), { traceEnabled: true });
    const nextState = computeNextAdaptiveVisorLayout(initialState, {
      type: 'toggle-map-panel',
      panelId: 'my-proposals',
    });
    const entry = nextState.decisionTrace[nextState.decisionTrace.length - 1];

    expect(entry).toBeDefined();
    expect(entry?.eventType).toBe('toggle-map-panel');
    expect(entry?.decision).toBe('toggle-map-panel-open');
    expect(entry?.activePanels).toEqual(['my-proposals']);
    expect(entry?.activeWidgets).toEqual(['map-actions', 'history-navigation', 'compass', 'map-legend']);
    expect(entry?.sequence).toBe(1);
  });

  it('does not append traces when trace mode is disabled', () => {
    const initialState = createAdaptiveVisorCompositorState(true, createContext(), { traceEnabled: false });
    const nextState = computeNextAdaptiveVisorLayout(initialState, {
      type: 'toggle-map-panel',
      panelId: 'my-proposals',
    });

    expect(nextState.decisionTrace).toHaveLength(0);
    expect(nextState.nextDecisionTraceSequence).toBe(1);
  });
});
