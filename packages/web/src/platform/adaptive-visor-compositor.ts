/**
 * Adaptive visor compositor — deterministic layout policy for visor surfaces.
 *
 * Replaces mode-specific branching with a single policy graph that maps
 * platform context + intent + mutation events to the next visor layout.
 * This keeps behavior debuggable while supporting restore/recompute rules.
 */

import type { Altitude } from '../space/viewport-math.js';

export type AdaptiveVisorContextClass = 'map' | 'interior' | 'visor-organism';
export type AdaptiveVisorMajorPanelId = 'visor-view' | 'interior-actions';
export type AdaptiveVisorMapPanelId = 'threshold' | 'mine' | 'templates' | 'template-values';
export type AdaptiveVisorPanelId = AdaptiveVisorMajorPanelId | AdaptiveVisorMapPanelId;
export type AdaptiveVisorWidgetId = 'map-actions';
export type AdaptiveVisorAnchorId = 'visor-toggle' | 'navigation-back' | 'dismiss';
export type AdaptiveVisorIntentId = 'template-values-flow';
export type AdaptiveVisorDecision = string;

export interface AdaptiveVisorLayoutContext {
  visorOpen: boolean;
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
  layoutContext: AdaptiveVisorLayoutContext;
  activePanels: AdaptiveVisorPanelId[];
  activeWidgets: AdaptiveVisorWidgetId[];
  anchors: AdaptiveVisorAnchorId[];
  layoutHistory: AdaptiveVisorLayoutSnapshot[];
  intentStack: AdaptiveVisorIntentId[];
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
  | { type: 'context-changed'; context: AdaptiveVisorLayoutContext }
  | { type: 'toggle-map-panel'; panelId: Exclude<AdaptiveVisorMapPanelId, 'template-values'> }
  | { type: 'open-template-values' }
  | { type: 'close-temporary-panel' }
  | { type: 'mutation' };

const ANCHORS: AdaptiveVisorAnchorId[] = ['visor-toggle', 'navigation-back', 'dismiss'];
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
  return panelId === 'threshold' || panelId === 'mine' || panelId === 'templates' || panelId === 'template-values';
}

function isRestorableMapPanel(
  panelId: AdaptiveVisorPanelId,
): panelId is Exclude<AdaptiveVisorMapPanelId, 'template-values'> {
  return panelId === 'threshold' || panelId === 'mine' || panelId === 'templates';
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
  if (!context.visorOpen) return { activePanels: [], activeWidgets: [] };
  if (context.contextClass === 'visor-organism' && context.visorOrganismId) {
    return { activePanels: ['visor-view'], activeWidgets: [] };
  }
  if (context.contextClass === 'interior' && context.enteredOrganismId) {
    return { activePanels: ['interior-actions'], activeWidgets: [] };
  }
  return { activePanels: [], activeWidgets: ['map-actions'] };
}

function selectRestorableMapPanels(snapshot: AdaptiveVisorLayoutSnapshot): AdaptiveVisorPanelId[] {
  return constrainPanels(snapshot.activePanels.filter((panelId) => isRestorableMapPanel(panelId)));
}

function handleContextChanged(
  state: AdaptiveVisorCompositorState,
  context: AdaptiveVisorLayoutContext,
): AdaptiveVisorPolicyResult {
  const wasVisible = state.layoutContext.visorOpen;
  const willBeVisible = context.visorOpen;
  const contextClassChanged = state.layoutContext.contextClass !== context.contextClass;
  let layoutHistory = state.layoutHistory;

  if (wasVisible && (contextClassChanged || !willBeVisible)) {
    layoutHistory = pushHistory(state);
  }

  const recomputed = recomputeForContext(context);
  if (context.contextClass !== 'map' || !context.visorOpen) {
    return {
      nextState: {
        ...state,
        layoutContext: context,
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
        ...state,
        layoutContext: context,
        activePanels: constrainPanels(state.activePanels.filter((panelId) => isMapPanel(panelId))),
        activeWidgets: ['map-actions'],
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
        ...state,
        layoutContext: context,
        activePanels: selectRestorableMapPanels(restored),
        activeWidgets: ['map-actions'],
        anchors: ANCHORS,
        layoutHistory: nextHistory,
        intentStack: [],
      },
      decision: 'restore-history-layout',
    };
  }

  return {
    nextState: {
      ...state,
      layoutContext: context,
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
  panelId: Exclude<AdaptiveVisorMapPanelId, 'template-values'>,
): AdaptiveVisorPolicyResult {
  if (!state.layoutContext.visorOpen || state.layoutContext.contextClass !== 'map') {
    return { nextState: state, decision: 'ignore-toggle-map-panel-not-eligible' };
  }

  const currentlyActive = selectActiveMapPanel(state);
  const nextPanel = currentlyActive === panelId ? null : panelId;

  return {
    nextState: {
      ...state,
      activePanels: nextPanel ? [nextPanel] : [],
      activeWidgets: ['map-actions'],
      anchors: ANCHORS,
      intentStack: currentlyActive === 'template-values' ? [] : state.intentStack,
    },
    decision: nextPanel ? 'toggle-map-panel-open' : 'toggle-map-panel-close',
  };
}

function handleOpenTemplateValues(state: AdaptiveVisorCompositorState): AdaptiveVisorPolicyResult {
  if (!state.layoutContext.visorOpen || state.layoutContext.contextClass !== 'map') {
    return { nextState: state, decision: 'ignore-open-template-values-not-eligible' };
  }

  return {
    nextState: {
      ...state,
      activePanels: ['template-values'],
      activeWidgets: ['map-actions'],
      anchors: ANCHORS,
      layoutHistory: pushHistory(state),
      intentStack: [...state.intentStack, 'template-values-flow'],
    },
    decision: 'open-template-values-panel',
  };
}

function handleCloseTemporaryPanel(state: AdaptiveVisorCompositorState): AdaptiveVisorPolicyResult {
  const topIntent = state.intentStack[state.intentStack.length - 1];
  if (topIntent !== 'template-values-flow') {
    if (selectActiveMapPanel(state) !== 'template-values') {
      return { nextState: state, decision: 'ignore-close-temporary-no-template-values-panel' };
    }
    return {
      nextState: {
        ...state,
        activePanels: [],
        activeWidgets:
          state.layoutContext.visorOpen && state.layoutContext.contextClass === 'map' ? ['map-actions'] : [],
        anchors: ANCHORS,
        intentStack: [],
      },
      decision: 'close-template-values-no-restore',
    };
  }

  const { restored, nextHistory } = popLatestRestorableSnapshot(
    state.layoutHistory,
    state.layoutContext.contextClass,
    state.lastMutationToken,
  );

  const intentStack = state.intentStack.slice(0, -1);

  if (!restored) {
    return {
      nextState: {
        ...state,
        activePanels: [],
        activeWidgets:
          state.layoutContext.visorOpen && state.layoutContext.contextClass === 'map' ? ['map-actions'] : [],
        anchors: ANCHORS,
        intentStack,
        layoutHistory: nextHistory,
      },
      decision: 'close-template-values-recompute',
    };
  }

  return {
    nextState: {
      ...state,
      activePanels: selectRestorableMapPanels(restored),
      activeWidgets: ['map-actions'],
      anchors: ANCHORS,
      intentStack,
      layoutHistory: nextHistory,
    },
    decision: 'close-template-values-restore',
  };
}

export function deriveAdaptiveVisorContext(input: {
  visorOpen: boolean;
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
    visorOpen: input.visorOpen,
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
  if (!state.adaptiveEnabled) {
    if (event.type !== 'context-changed') {
      return applyDecisionTrace(state, event, {
        nextState: state,
        decision: 'ignore-event-adaptive-disabled',
      });
    }
    const recomputed = recomputeForContext(event.context);
    return applyDecisionTrace(state, event, {
      nextState: {
        ...state,
        layoutContext: event.context,
        activePanels: recomputed.activePanels,
        activeWidgets: recomputed.activeWidgets,
        anchors: ANCHORS,
      },
      decision: 'recompute-layout-adaptive-disabled',
    });
  }

  let result: AdaptiveVisorPolicyResult;
  switch (event.type) {
    case 'context-changed':
      result = handleContextChanged(state, event.context);
      break;

    case 'toggle-map-panel':
      result = handleToggleMapPanel(state, event.panelId);
      break;

    case 'open-template-values':
      result = handleOpenTemplateValues(state);
      break;

    case 'close-temporary-panel':
      result = handleCloseTemporaryPanel(state);
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
