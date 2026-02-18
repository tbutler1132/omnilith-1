/**
 * Adaptive visor compositor — deterministic layout policy for visor surfaces.
 *
 * Replaces mode-specific branching with a single policy graph that maps
 * platform context + intent + mutation events to the next visor layout.
 * This keeps behavior debuggable while supporting restore/recompute rules.
 */

import type { VisorWidgetId } from '../hud/panels/core/widget-schema.js';
import type { Altitude } from '../space/viewport-math.js';

export type AdaptiveVisorContextClass = 'map' | 'interior' | 'visor-organism';
export type AdaptiveVisorSpatialLocation = 'map' | 'interior';
export type AdaptiveVisorMajorPanelId = 'visor-view' | 'interior-actions';
export type AdaptiveVisorMapPanelId = 'profile' | 'my-proposals';
export type AdaptiveVisorPanelId = AdaptiveVisorMajorPanelId | AdaptiveVisorMapPanelId;
export type AdaptiveVisorWidgetId = VisorWidgetId;
export type AdaptiveVisorAnchorId = 'navigation-back' | 'dismiss';
export type AdaptiveVisorDecision = string;

export interface AdaptiveVisorLayoutContext {
  contextClass: AdaptiveVisorContextClass;
  focusedOrganismId: string | null;
  enteredOrganismId: string | null;
  visorOrganismId: string | null;
  altitude: Altitude;
}

export interface AdaptiveVisorLayoutSnapshot {
  contextClass: AdaptiveVisorContextClass;
  mutationToken: number;
  activePanels: AdaptiveVisorPanelId[];
  activeWidgets: AdaptiveVisorWidgetId[];
}

export interface AdaptiveVisorCompositorState {
  adaptiveEnabled: boolean;
  traceEnabled: boolean;
  spatialLocation: AdaptiveVisorSpatialLocation;
  focusedOrganismId: string | null;
  enteredOrganismId: string | null;
  visorOrganismId: string | null;
  altitude: Altitude;
  layoutContext: AdaptiveVisorLayoutContext;
  activePanels: AdaptiveVisorPanelId[];
  activeWidgets: AdaptiveVisorWidgetId[];
  anchors: AdaptiveVisorAnchorId[];
  layoutHistory: AdaptiveVisorLayoutSnapshot[];
  intentStack: string[];
  lastMutationToken: number;
  decisionTrace: AdaptiveVisorDecisionTraceEntry[];
  nextDecisionTraceSequence: number;
}

export interface AdaptiveVisorDecisionTraceEntry {
  sequence: number;
  eventType: AdaptiveVisorCompositorEvent['type'];
  decision: AdaptiveVisorDecision;
  contextClass: AdaptiveVisorContextClass;
  activePanels: AdaptiveVisorPanelId[];
  activeWidgets: AdaptiveVisorWidgetId[];
  mutationToken: number;
}

export type AdaptiveVisorCompositorEvent =
  | { type: 'enter-map' }
  | { type: 'focus-organism'; organismId: string | null }
  | { type: 'enter-organism'; organismId: string }
  | { type: 'exit-organism' }
  | { type: 'open-visor-organism'; organismId: string }
  | { type: 'close-visor-organism' }
  | { type: 'set-altitude'; altitude: Altitude }
  | { type: 'toggle-map-panel'; panelId: AdaptiveVisorMapPanelId }
  | { type: 'mutation' };

const ANCHORS: AdaptiveVisorAnchorId[] = ['navigation-back', 'dismiss'];
const MAX_MAJOR_PANELS = 2;
const MAX_LAYOUT_HISTORY = 12;
const MAX_DECISION_TRACE = 80;

interface AdaptiveVisorPolicyResult {
  nextState: AdaptiveVisorCompositorState;
  decision: AdaptiveVisorDecision;
}

function trimHistory(layoutHistory: AdaptiveVisorLayoutSnapshot[]): AdaptiveVisorLayoutSnapshot[] {
  if (layoutHistory.length <= MAX_LAYOUT_HISTORY) return layoutHistory;
  return layoutHistory.slice(layoutHistory.length - MAX_LAYOUT_HISTORY);
}

function pushHistory(state: AdaptiveVisorCompositorState): AdaptiveVisorLayoutSnapshot[] {
  const hasVisibleLayout = state.activePanels.length > 0 || state.activeWidgets.length > 0;
  if (!hasVisibleLayout) return state.layoutHistory;
  return trimHistory([
    ...state.layoutHistory,
    {
      contextClass: state.layoutContext.contextClass,
      mutationToken: state.lastMutationToken,
      activePanels: state.activePanels,
      activeWidgets: state.activeWidgets,
    },
  ]);
}

function trimDecisionTrace(decisionTrace: AdaptiveVisorDecisionTraceEntry[]): AdaptiveVisorDecisionTraceEntry[] {
  if (decisionTrace.length <= MAX_DECISION_TRACE) return decisionTrace;
  return decisionTrace.slice(decisionTrace.length - MAX_DECISION_TRACE);
}

function toSpatialLocation(enteredOrganismId: string | null): AdaptiveVisorSpatialLocation {
  return enteredOrganismId ? 'interior' : 'map';
}

function withCanonicalFromContext(
  state: AdaptiveVisorCompositorState,
  context: AdaptiveVisorLayoutContext,
): AdaptiveVisorCompositorState {
  return {
    ...state,
    spatialLocation: toSpatialLocation(context.enteredOrganismId),
    focusedOrganismId: context.focusedOrganismId,
    enteredOrganismId: context.enteredOrganismId,
    visorOrganismId: context.visorOrganismId,
    altitude: context.altitude,
    layoutContext: context,
  };
}

function applyDecisionTrace(
  previousState: AdaptiveVisorCompositorState,
  event: AdaptiveVisorCompositorEvent,
  result: AdaptiveVisorPolicyResult,
): AdaptiveVisorCompositorState {
  const nextState = result.nextState;
  if (!nextState.traceEnabled) return nextState;

  const entry: AdaptiveVisorDecisionTraceEntry = {
    sequence: previousState.nextDecisionTraceSequence,
    eventType: event.type,
    decision: result.decision,
    contextClass: nextState.layoutContext.contextClass,
    activePanels: nextState.activePanels,
    activeWidgets: nextState.activeWidgets,
    mutationToken: nextState.lastMutationToken,
  };

  return {
    ...nextState,
    decisionTrace: trimDecisionTrace([...nextState.decisionTrace, entry]),
    nextDecisionTraceSequence: previousState.nextDecisionTraceSequence + 1,
  };
}

function constrainPanels(activePanels: AdaptiveVisorPanelId[]): AdaptiveVisorPanelId[] {
  if (activePanels.length <= MAX_MAJOR_PANELS) return activePanels;
  return activePanels.slice(0, MAX_MAJOR_PANELS);
}

function isMapPanel(panelId: AdaptiveVisorPanelId): panelId is AdaptiveVisorMapPanelId {
  return panelId === 'profile' || panelId === 'my-proposals';
}

function isRestorableMapPanel(panelId: AdaptiveVisorPanelId): panelId is AdaptiveVisorMapPanelId {
  return panelId === 'profile' || panelId === 'my-proposals';
}

function popLatestRestorableSnapshot(
  layoutHistory: AdaptiveVisorLayoutSnapshot[],
  contextClass: AdaptiveVisorContextClass,
  mutationToken: number,
): { restored: AdaptiveVisorLayoutSnapshot | null; nextHistory: AdaptiveVisorLayoutSnapshot[] } {
  for (let idx = layoutHistory.length - 1; idx >= 0; idx -= 1) {
    const candidate = layoutHistory[idx];
    if (candidate.contextClass !== contextClass) continue;
    if (candidate.mutationToken !== mutationToken) continue;
    if (!candidate.activePanels.some((panelId) => isRestorableMapPanel(panelId))) continue;

    const nextHistory = [...layoutHistory.slice(0, idx), ...layoutHistory.slice(idx + 1)];
    return { restored: candidate, nextHistory };
  }
  return { restored: null, nextHistory: layoutHistory };
}

function recomputeForContext(context: AdaptiveVisorLayoutContext): {
  activePanels: AdaptiveVisorPanelId[];
  activeWidgets: AdaptiveVisorWidgetId[];
} {
  const activeWidgets = resolveWidgetsForContext(context);
  if (context.contextClass === 'visor-organism' && context.visorOrganismId) {
    return { activePanels: ['visor-view'], activeWidgets };
  }
  if (context.contextClass === 'interior' && context.enteredOrganismId) {
    return { activePanels: ['interior-actions'], activeWidgets };
  }
  return { activePanels: [], activeWidgets };
}

function resolveWidgetsForContext(context: AdaptiveVisorLayoutContext): AdaptiveVisorWidgetId[] {
  if (context.contextClass === 'map') {
    return ['map-actions', 'history-navigation', 'compass'];
  }
  if (context.contextClass === 'visor-organism' && context.visorOrganismId) {
    return ['history-navigation', 'vitality'];
  }
  return [];
}

function selectRestorableMapPanels(snapshot: AdaptiveVisorLayoutSnapshot): AdaptiveVisorPanelId[] {
  return constrainPanels(snapshot.activePanels.filter((panelId) => isRestorableMapPanel(panelId)));
}

function handleContextChanged(
  state: AdaptiveVisorCompositorState,
  context: AdaptiveVisorLayoutContext,
): AdaptiveVisorPolicyResult {
  const contextClassChanged = state.layoutContext.contextClass !== context.contextClass;
  let layoutHistory = state.layoutHistory;

  if (contextClassChanged) {
    layoutHistory = pushHistory(state);
  }

  const recomputed = recomputeForContext(context);
  if (context.contextClass !== 'map') {
    return {
      nextState: {
        ...withCanonicalFromContext(state, context),
        activePanels: recomputed.activePanels,
        activeWidgets: recomputed.activeWidgets,
        anchors: ANCHORS,
        layoutHistory,
        intentStack: context.contextClass === state.layoutContext.contextClass ? state.intentStack : [],
      },
      decision: 'recompute-context-layout',
    };
  }

  const canKeepCurrentMapPanel = state.activePanels.some((panelId) => isMapPanel(panelId));
  if (canKeepCurrentMapPanel && contextClassChanged === false) {
    return {
      nextState: {
        ...withCanonicalFromContext(state, context),
        activePanels: constrainPanels(state.activePanels.filter((panelId) => isMapPanel(panelId))),
        activeWidgets: resolveWidgetsForContext(context),
        anchors: ANCHORS,
        layoutHistory,
      },
      decision: 'keep-current-map-panel',
    };
  }

  const { restored, nextHistory } = popLatestRestorableSnapshot(
    layoutHistory,
    context.contextClass,
    state.lastMutationToken,
  );
  if (restored) {
    return {
      nextState: {
        ...withCanonicalFromContext(state, context),
        activePanels: selectRestorableMapPanels(restored),
        activeWidgets: resolveWidgetsForContext(context),
        anchors: ANCHORS,
        layoutHistory: nextHistory,
        intentStack: [],
      },
      decision: 'restore-history-layout',
    };
  }

  return {
    nextState: {
      ...withCanonicalFromContext(state, context),
      activePanels: recomputed.activePanels,
      activeWidgets: recomputed.activeWidgets,
      anchors: ANCHORS,
      layoutHistory,
      intentStack: [],
    },
    decision: 'recompute-map-layout',
  };
}

function handleToggleMapPanel(
  state: AdaptiveVisorCompositorState,
  panelId: AdaptiveVisorMapPanelId,
): AdaptiveVisorPolicyResult {
  if (state.layoutContext.contextClass !== 'map') {
    return { nextState: state, decision: 'ignore-toggle-map-panel-not-eligible' };
  }

  const currentlyActive = selectActiveMapPanel(state);
  const nextPanel = currentlyActive === panelId ? null : panelId;

  return {
    nextState: {
      ...state,
      activePanels: nextPanel ? [nextPanel] : [],
      activeWidgets: resolveWidgetsForContext(state.layoutContext),
      anchors: ANCHORS,
      intentStack: [],
    },
    decision: nextPanel ? 'toggle-map-panel-open' : 'toggle-map-panel-close',
  };
}

function handleFocusOrganism(
  state: AdaptiveVisorCompositorState,
  organismId: string | null,
): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: state.visorOrganismId,
    enteredOrganismId: state.enteredOrganismId,
    focusedOrganismId: organismId,
    altitude: state.altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'focus-organism',
  };
}

function handleEnterMap(state: AdaptiveVisorCompositorState): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: null,
    enteredOrganismId: null,
    focusedOrganismId: null,
    altitude: state.altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'enter-map',
  };
}

function handleEnterOrganism(state: AdaptiveVisorCompositorState, organismId: string): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: null,
    enteredOrganismId: organismId,
    focusedOrganismId: organismId,
    altitude: state.altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'enter-organism',
  };
}

function handleExitOrganism(state: AdaptiveVisorCompositorState): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: state.visorOrganismId,
    enteredOrganismId: null,
    focusedOrganismId: state.focusedOrganismId,
    altitude: state.altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'exit-organism',
  };
}

function handleOpenVisorOrganism(state: AdaptiveVisorCompositorState, organismId: string): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: organismId,
    enteredOrganismId: state.enteredOrganismId,
    focusedOrganismId: state.focusedOrganismId,
    altitude: state.altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'open-visor-organism',
  };
}

function handleCloseVisorOrganism(state: AdaptiveVisorCompositorState): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: null,
    enteredOrganismId: state.enteredOrganismId,
    focusedOrganismId: state.focusedOrganismId,
    altitude: state.altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'close-visor-organism',
  };
}

function handleSetAltitude(state: AdaptiveVisorCompositorState, altitude: Altitude): AdaptiveVisorPolicyResult {
  const context = deriveAdaptiveVisorContext({
    visorOrganismId: state.visorOrganismId,
    enteredOrganismId: state.enteredOrganismId,
    focusedOrganismId: state.focusedOrganismId,
    altitude,
  });

  const result = handleContextChanged(state, context);
  return {
    nextState: result.nextState,
    decision: 'set-altitude',
  };
}

export function deriveAdaptiveVisorContext(input: {
  visorOrganismId: string | null;
  enteredOrganismId: string | null;
  focusedOrganismId: string | null;
  altitude: Altitude;
}): AdaptiveVisorLayoutContext {
  const contextClass: AdaptiveVisorContextClass = input.visorOrganismId
    ? 'visor-organism'
    : input.enteredOrganismId
      ? 'interior'
      : 'map';

  return {
    contextClass,
    focusedOrganismId: input.focusedOrganismId,
    enteredOrganismId: input.enteredOrganismId,
    visorOrganismId: input.visorOrganismId,
    altitude: input.altitude,
  };
}

export function createAdaptiveVisorCompositorState(
  adaptiveEnabled: boolean,
  context: AdaptiveVisorLayoutContext,
  options?: { traceEnabled?: boolean },
): AdaptiveVisorCompositorState {
  const recomputed = recomputeForContext(context);
  return {
    adaptiveEnabled,
    traceEnabled: options?.traceEnabled ?? false,
    spatialLocation: toSpatialLocation(context.enteredOrganismId),
    focusedOrganismId: context.focusedOrganismId,
    enteredOrganismId: context.enteredOrganismId,
    visorOrganismId: context.visorOrganismId,
    altitude: context.altitude,
    layoutContext: context,
    activePanels: recomputed.activePanels,
    activeWidgets: recomputed.activeWidgets,
    anchors: ANCHORS,
    layoutHistory: [],
    intentStack: [],
    lastMutationToken: 0,
    decisionTrace: [],
    nextDecisionTraceSequence: 1,
  };
}

export function computeNextAdaptiveVisorLayout(
  state: AdaptiveVisorCompositorState,
  event: AdaptiveVisorCompositorEvent,
): AdaptiveVisorCompositorState {
  if (!state.adaptiveEnabled && (event.type === 'toggle-map-panel' || event.type === 'mutation')) {
    return applyDecisionTrace(state, event, {
      nextState: state,
      decision: 'ignore-policy-event-adaptive-disabled',
    });
  }

  let result: AdaptiveVisorPolicyResult;
  switch (event.type) {
    case 'enter-map':
      result = handleEnterMap(state);
      break;

    case 'focus-organism':
      result = handleFocusOrganism(state, event.organismId);
      break;

    case 'enter-organism':
      result = handleEnterOrganism(state, event.organismId);
      break;

    case 'exit-organism':
      result = handleExitOrganism(state);
      break;

    case 'open-visor-organism':
      result = handleOpenVisorOrganism(state, event.organismId);
      break;

    case 'close-visor-organism':
      result = handleCloseVisorOrganism(state);
      break;

    case 'set-altitude':
      result = handleSetAltitude(state, event.altitude);
      break;

    case 'toggle-map-panel':
      result = handleToggleMapPanel(state, event.panelId);
      break;

    case 'mutation':
      result = {
        nextState: {
          ...state,
          lastMutationToken: state.lastMutationToken + 1,
          intentStack: [],
        },
        decision: 'mutation-token-bump',
      };
      break;
  }

  return applyDecisionTrace(state, event, result);
}

export function selectActiveMapPanel(state: AdaptiveVisorCompositorState): AdaptiveVisorMapPanelId | null {
  const panel = state.activePanels.find((panelId) => isMapPanel(panelId));
  return panel ?? null;
}
