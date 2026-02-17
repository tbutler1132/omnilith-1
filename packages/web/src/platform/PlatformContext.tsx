/**
 * PlatformContext — shared state for the Space + HUD paradigm.
 *
 * Manages navigation (map stack), organism focus, visor targeting,
 * and current altitude. All platform-level coordination flows
 * through this context.
 */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Altitude } from '../space/viewport-math.js';
import {
  type AdaptiveVisorCompositorState,
  type AdaptiveVisorMapPanelId,
  computeNextAdaptiveVisorLayout,
  createAdaptiveVisorCompositorState,
  deriveAdaptiveVisorContext,
} from './adaptive-visor-compositor.js';
import { isAdaptiveVisorDecisionTraceEnabled } from './adaptive-visor-feature-flag.js';

interface NavigationEntry {
  mapId: string;
  label: string;
}

export type AuthMode = 'guest' | 'authenticated';

export interface PlatformState {
  /** Immutable per session */
  authMode: AuthMode;
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
  worldMapId: string;

  /** Navigation */
  navigationStack: NavigationEntry[];
  currentMapId: string;

  /** Focus */
  focusedOrganismId: string | null;

  /** Organism entry — currently inside this organism's interior */
  enteredOrganismId: string | null;

  /** Visor targeting */
  visorOrganismId: string | null;

  /** Current altitude level (synced from Space viewport) */
  altitude: Altitude;

  /** Where the user is currently looking on the map */
  viewportCenter: { x: number; y: number };

  /** Incremented after surfacing to trigger spatial map refetch */
  mapRefreshKey: number;
}

export interface PlatformStaticState {
  authMode: AuthMode;
  canWrite: boolean;
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
  worldMapId: string;
}

export interface PlatformMapState {
  navigationStack: NavigationEntry[];
  currentMapId: string;
  focusedOrganismId: string | null;
  enteredOrganismId: string | null;
}

export interface PlatformVisorState {
  visorOrganismId: string | null;
}

export interface PlatformViewportMetaState {
  altitude: Altitude;
  viewportCenter: { x: number; y: number };
  mapRefreshKey: number;
}

export interface PlatformAdaptiveVisorState extends AdaptiveVisorCompositorState {}

export interface PlatformAdaptiveVisorActions {
  toggleMapPanel: (panelId: Exclude<AdaptiveVisorMapPanelId, 'template-values'>) => void;
  openTemplateValuesPanel: () => void;
  closeTemporaryPanel: () => void;
  bumpMutationToken: () => void;
}

type PlatformAction =
  | { type: 'FOCUS_ORGANISM'; id: string | null }
  | { type: 'ENTER_MAP'; mapId: string; label: string }
  | { type: 'EXIT_MAP' }
  | { type: 'NAVIGATE_TO_MAP'; mapId: string }
  | { type: 'OPEN_IN_VISOR'; id: string }
  | { type: 'CLOSE_VISOR_ORGANISM' }
  | { type: 'SET_ALTITUDE'; altitude: Altitude }
  | { type: 'ENTER_ORGANISM'; id: string }
  | { type: 'EXIT_ORGANISM' }
  | { type: 'SET_VIEWPORT_CENTER'; x: number; y: number }
  | { type: 'BUMP_MAP_REFRESH' };

const VIEWPORT_CENTER_EPSILON = 24;

function reducer(state: PlatformState, action: PlatformAction): PlatformState {
  switch (action.type) {
    case 'FOCUS_ORGANISM':
      return {
        ...state,
        focusedOrganismId: action.id,
      };

    case 'ENTER_MAP':
      return {
        ...state,
        navigationStack: [...state.navigationStack, { mapId: action.mapId, label: action.label }],
        currentMapId: action.mapId,
        focusedOrganismId: null,
      };

    case 'EXIT_MAP': {
      if (state.navigationStack.length <= 1) return state;
      const newStack = state.navigationStack.slice(0, -1);
      return {
        ...state,
        navigationStack: newStack,
        currentMapId: newStack[newStack.length - 1].mapId,
        focusedOrganismId: null,
      };
    }

    case 'NAVIGATE_TO_MAP': {
      const idx = state.navigationStack.findIndex((e) => e.mapId === action.mapId);
      if (idx === -1) return state;
      const newStack = state.navigationStack.slice(0, idx + 1);
      return {
        ...state,
        navigationStack: newStack,
        currentMapId: newStack[newStack.length - 1].mapId,
        focusedOrganismId: null,
      };
    }

    case 'OPEN_IN_VISOR':
      return { ...state, visorOrganismId: action.id };

    case 'CLOSE_VISOR_ORGANISM':
      return { ...state, visorOrganismId: null };

    case 'SET_ALTITUDE':
      if (state.altitude === action.altitude) return state;
      return { ...state, altitude: action.altitude };

    case 'ENTER_ORGANISM':
      return {
        ...state,
        enteredOrganismId: action.id,
        focusedOrganismId: action.id,
        visorOrganismId: null,
      };

    case 'EXIT_ORGANISM':
      return {
        ...state,
        enteredOrganismId: null,
      };

    case 'SET_VIEWPORT_CENTER':
      if (
        Math.abs(state.viewportCenter.x - action.x) < VIEWPORT_CENTER_EPSILON &&
        Math.abs(state.viewportCenter.y - action.y) < VIEWPORT_CENTER_EPSILON
      ) {
        return state;
      }
      return {
        ...state,
        viewportCenter: { x: action.x, y: action.y },
      };

    case 'BUMP_MAP_REFRESH':
      return {
        ...state,
        mapRefreshKey: state.mapRefreshKey + 1,
      };
  }
}

interface PlatformContextValue {
  state: PlatformState;
  focusOrganism: (id: string | null) => void;
  enterMap: (mapId: string, label: string) => void;
  exitMap: () => void;
  navigateToMap: (mapId: string) => void;
  enterOrganism: (id: string) => void;
  exitOrganism: () => void;
  openInVisor: (id: string) => void;
  closeVisorOrganism: () => void;
  setAltitude: (altitude: Altitude) => void;
  setViewportCenter: (x: number, y: number) => void;
  bumpMapRefresh: () => void;
}

export interface PlatformActions {
  focusOrganism: (id: string | null) => void;
  enterMap: (mapId: string, label: string) => void;
  exitMap: () => void;
  navigateToMap: (mapId: string) => void;
  enterOrganism: (id: string) => void;
  exitOrganism: () => void;
  openInVisor: (id: string) => void;
  closeVisorOrganism: () => void;
  setAltitude: (altitude: Altitude) => void;
  setViewportCenter: (x: number, y: number) => void;
  bumpMapRefresh: () => void;
}

const StaticStateContext = createContext<PlatformStaticState | null>(null);
const MapStateContext = createContext<PlatformMapState | null>(null);
const VisorStateContext = createContext<PlatformVisorState | null>(null);
const ViewportMetaStateContext = createContext<PlatformViewportMetaState | null>(null);
const ActionsContext = createContext<PlatformActions | null>(null);
const AdaptiveVisorStateContext = createContext<PlatformAdaptiveVisorState | null>(null);
const AdaptiveVisorActionsContext = createContext<PlatformAdaptiveVisorActions | null>(null);

interface PlatformProviderProps {
  authMode: AuthMode;
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
  worldMapId: string;
  children: ReactNode;
}

function buildAdaptiveVisorContext(state: PlatformState) {
  return deriveAdaptiveVisorContext({
    visorOrganismId: state.visorOrganismId,
    enteredOrganismId: state.enteredOrganismId,
    focusedOrganismId: state.focusedOrganismId,
    altitude: state.altitude,
  });
}

export function PlatformProvider({
  authMode,
  userId,
  personalOrganismId,
  homePageOrganismId,
  worldMapId,
  children,
}: PlatformProviderProps) {
  const initialOrganismId = new URLSearchParams(window.location.search).get('organism');
  const adaptiveEnabled = true;
  const traceEnabled = useMemo(() => isAdaptiveVisorDecisionTraceEnabled(), []);

  const initialState: PlatformState = {
    authMode,
    userId,
    personalOrganismId,
    homePageOrganismId,
    worldMapId,
    navigationStack: [{ mapId: worldMapId, label: 'World' }],
    currentMapId: worldMapId,
    focusedOrganismId: null,
    enteredOrganismId: null,
    visorOrganismId: initialOrganismId,
    altitude: 'high',
    viewportCenter: { x: 2500, y: 2500 },
    mapRefreshKey: 0,
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const [adaptiveVisorState, adaptiveVisorDispatch] = useReducer(
    computeNextAdaptiveVisorLayout,
    createAdaptiveVisorCompositorState(adaptiveEnabled, buildAdaptiveVisorContext(initialState), {
      traceEnabled,
    }),
  );
  const lastLoggedTraceSequence = useRef(0);
  const adaptiveVisorContext = useMemo(
    () =>
      deriveAdaptiveVisorContext({
        visorOrganismId: state.visorOrganismId,
        enteredOrganismId: state.enteredOrganismId,
        focusedOrganismId: state.focusedOrganismId,
        altitude: state.altitude,
      }),
    [state.visorOrganismId, state.enteredOrganismId, state.focusedOrganismId, state.altitude],
  );

  useEffect(() => {
    adaptiveVisorDispatch({
      type: 'context-changed',
      context: adaptiveVisorContext,
    });
  }, [adaptiveVisorContext]);

  useEffect(() => {
    if (!adaptiveVisorState.traceEnabled) return;
    const latestEntry = adaptiveVisorState.decisionTrace[adaptiveVisorState.decisionTrace.length - 1];
    if (!latestEntry) return;
    if (latestEntry.sequence <= lastLoggedTraceSequence.current) return;

    console.debug('[adaptive-visor]', {
      event: latestEntry.eventType,
      decision: latestEntry.decision,
      contextClass: latestEntry.contextClass,
      activePanels: latestEntry.activePanels,
      activeWidgets: latestEntry.activeWidgets,
      mutationToken: latestEntry.mutationToken,
      sequence: latestEntry.sequence,
    });
    lastLoggedTraceSequence.current = latestEntry.sequence;
  }, [adaptiveVisorState.traceEnabled, adaptiveVisorState.decisionTrace]);

  const focusOrganism = useCallback((id: string | null) => dispatch({ type: 'FOCUS_ORGANISM', id }), []);
  const enterOrganism = useCallback((id: string) => dispatch({ type: 'ENTER_ORGANISM', id }), []);
  const exitOrganism = useCallback(() => dispatch({ type: 'EXIT_ORGANISM' }), []);
  const enterMap = useCallback((mapId: string, label: string) => dispatch({ type: 'ENTER_MAP', mapId, label }), []);
  const exitMap = useCallback(() => dispatch({ type: 'EXIT_MAP' }), []);
  const navigateToMap = useCallback((mapId: string) => dispatch({ type: 'NAVIGATE_TO_MAP', mapId }), []);
  const openInVisor = useCallback((id: string) => dispatch({ type: 'OPEN_IN_VISOR', id }), []);
  const closeVisorOrganism = useCallback(() => dispatch({ type: 'CLOSE_VISOR_ORGANISM' }), []);
  const setAltitude = useCallback((altitude: Altitude) => dispatch({ type: 'SET_ALTITUDE', altitude }), []);
  const setViewportCenter = useCallback((x: number, y: number) => dispatch({ type: 'SET_VIEWPORT_CENTER', x, y }), []);
  const bumpMapRefresh = useCallback(() => dispatch({ type: 'BUMP_MAP_REFRESH' }), []);
  const toggleMapPanel = useCallback(
    (panelId: Exclude<AdaptiveVisorMapPanelId, 'template-values'>) =>
      adaptiveVisorDispatch({ type: 'toggle-map-panel', panelId }),
    [],
  );
  const openTemplateValuesPanel = useCallback(() => adaptiveVisorDispatch({ type: 'open-template-values' }), []);
  const closeTemporaryPanel = useCallback(() => adaptiveVisorDispatch({ type: 'close-temporary-panel' }), []);
  const bumpMutationToken = useCallback(() => adaptiveVisorDispatch({ type: 'mutation' }), []);

  const staticState = useMemo<PlatformStaticState>(
    () => ({
      authMode,
      canWrite: authMode === 'authenticated',
      userId,
      personalOrganismId,
      homePageOrganismId,
      worldMapId,
    }),
    [authMode, userId, personalOrganismId, homePageOrganismId, worldMapId],
  );

  const mapState = useMemo<PlatformMapState>(
    () => ({
      navigationStack: state.navigationStack,
      currentMapId: state.currentMapId,
      focusedOrganismId: state.focusedOrganismId,
      enteredOrganismId: state.enteredOrganismId,
    }),
    [state.navigationStack, state.currentMapId, state.focusedOrganismId, state.enteredOrganismId],
  );

  const visorState = useMemo<PlatformVisorState>(
    () => ({
      visorOrganismId: state.visorOrganismId,
    }),
    [state.visorOrganismId],
  );

  const viewportMetaState = useMemo<PlatformViewportMetaState>(
    () => ({
      altitude: state.altitude,
      viewportCenter: state.viewportCenter,
      mapRefreshKey: state.mapRefreshKey,
    }),
    [state.altitude, state.viewportCenter, state.mapRefreshKey],
  );

  const adaptiveState = useMemo<PlatformAdaptiveVisorState>(() => adaptiveVisorState, [adaptiveVisorState]);

  const adaptiveActions = useMemo<PlatformAdaptiveVisorActions>(
    () => ({
      toggleMapPanel,
      openTemplateValuesPanel,
      closeTemporaryPanel,
      bumpMutationToken,
    }),
    [toggleMapPanel, openTemplateValuesPanel, closeTemporaryPanel, bumpMutationToken],
  );

  const actions = useMemo<PlatformActions>(
    () => ({
      focusOrganism,
      enterOrganism,
      exitOrganism,
      enterMap,
      exitMap,
      navigateToMap,
      openInVisor,
      closeVisorOrganism,
      setAltitude,
      setViewportCenter,
      bumpMapRefresh,
    }),
    [
      focusOrganism,
      enterOrganism,
      exitOrganism,
      enterMap,
      exitMap,
      navigateToMap,
      openInVisor,
      closeVisorOrganism,
      setAltitude,
      setViewportCenter,
      bumpMapRefresh,
    ],
  );

  return (
    <StaticStateContext.Provider value={staticState}>
      <MapStateContext.Provider value={mapState}>
        <VisorStateContext.Provider value={visorState}>
          <ViewportMetaStateContext.Provider value={viewportMetaState}>
            <AdaptiveVisorStateContext.Provider value={adaptiveState}>
              <AdaptiveVisorActionsContext.Provider value={adaptiveActions}>
                <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
              </AdaptiveVisorActionsContext.Provider>
            </AdaptiveVisorStateContext.Provider>
          </ViewportMetaStateContext.Provider>
        </VisorStateContext.Provider>
      </MapStateContext.Provider>
    </StaticStateContext.Provider>
  );
}

export function usePlatformStaticState(): PlatformStaticState {
  const ctx = useContext(StaticStateContext);
  if (!ctx) throw new Error('usePlatformStaticState must be used within PlatformProvider');
  return ctx;
}

export function usePlatformMapState(): PlatformMapState {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error('usePlatformMapState must be used within PlatformProvider');
  return ctx;
}

export function usePlatformVisorState(): PlatformVisorState {
  const ctx = useContext(VisorStateContext);
  if (!ctx) throw new Error('usePlatformVisorState must be used within PlatformProvider');
  return ctx;
}

export function usePlatformViewportMeta(): PlatformViewportMetaState {
  const ctx = useContext(ViewportMetaStateContext);
  if (!ctx) throw new Error('usePlatformViewportMeta must be used within PlatformProvider');
  return ctx;
}

export function usePlatformActions(): PlatformActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('usePlatformActions must be used within PlatformProvider');
  return ctx;
}

export function usePlatformAdaptiveVisorState(): PlatformAdaptiveVisorState {
  const ctx = useContext(AdaptiveVisorStateContext);
  if (!ctx) throw new Error('usePlatformAdaptiveVisorState must be used within PlatformProvider');
  return ctx;
}

export function usePlatformAdaptiveVisorActions(): PlatformAdaptiveVisorActions {
  const ctx = useContext(AdaptiveVisorActionsContext);
  if (!ctx) throw new Error('usePlatformAdaptiveVisorActions must be used within PlatformProvider');
  return ctx;
}

export function usePlatform(): PlatformContextValue {
  const staticState = usePlatformStaticState();
  const mapState = usePlatformMapState();
  const visorState = usePlatformVisorState();
  const viewportMeta = usePlatformViewportMeta();
  const actions = usePlatformActions();

  const state = useMemo<PlatformState>(
    () => ({
      ...staticState,
      ...mapState,
      ...visorState,
      ...viewportMeta,
    }),
    [staticState, mapState, visorState, viewportMeta],
  );

  return useMemo(
    () => ({
      state,
      ...actions,
    }),
    [state, actions],
  );
}
