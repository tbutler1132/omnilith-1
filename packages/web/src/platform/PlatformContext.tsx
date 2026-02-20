/**
 * PlatformContext — shared state for the Space + HUD paradigm.
 *
 * Manages navigation (map stack), organism focus, visor targeting,
 * and current altitude. All platform-level coordination flows
 * through this context.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
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
  toggleMapPanel: (panelId: AdaptiveVisorMapPanelId) => void;
  bumpMutationToken: () => void;
}

interface PlatformReducerState {
  navigationStack: NavigationEntry[];
  currentMapId: string;
  altitude: Altitude;
  viewportCenter: { x: number; y: number };
  mapRefreshKey: number;
}

type PlatformAction =
  | { type: 'ENTER_MAP'; mapId: string; label: string }
  | { type: 'EXIT_MAP' }
  | { type: 'NAVIGATE_TO_MAP'; mapId: string }
  | { type: 'SET_ALTITUDE'; altitude: Altitude }
  | { type: 'SET_VIEWPORT_CENTER'; x: number; y: number }
  | { type: 'BUMP_MAP_REFRESH' };

const VIEWPORT_CENTER_EPSILON = 24;

function reducer(state: PlatformReducerState, action: PlatformAction): PlatformReducerState {
  switch (action.type) {
    case 'ENTER_MAP':
      return {
        ...state,
        navigationStack: [...state.navigationStack, { mapId: action.mapId, label: action.label }],
        currentMapId: action.mapId,
      };

    case 'EXIT_MAP': {
      if (state.navigationStack.length <= 1) return state;
      const newStack = state.navigationStack.slice(0, -1);
      return {
        ...state,
        navigationStack: newStack,
        currentMapId: newStack[newStack.length - 1].mapId,
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
      };
    }

    case 'SET_ALTITUDE':
      if (state.altitude === action.altitude) return state;
      return { ...state, altitude: action.altitude };

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

  const initialState: PlatformReducerState = {
    navigationStack: [{ mapId: worldMapId, label: 'World' }],
    currentMapId: worldMapId,
    altitude: 'high',
    viewportCenter: { x: 2500, y: 2500 },
    mapRefreshKey: 0,
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const [focusedOrganismId, setFocusedOrganismId] = useState<string | null>(null);
  const [enteredOrganismId, setEnteredOrganismId] = useState<string | null>(null);
  const [adaptiveVisorState, adaptiveVisorDispatch] = useReducer(
    computeNextAdaptiveVisorLayout,
    createAdaptiveVisorCompositorState(
      adaptiveEnabled,
      deriveAdaptiveVisorContext({
        visorOrganismId: initialOrganismId,
        enteredOrganismId: null,
        focusedOrganismId: null,
        altitude: initialState.altitude,
      }),
      { traceEnabled },
    ),
  );
  const lastLoggedTraceSequence = useRef(0);

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

  const focusOrganism = useCallback((id: string | null) => {
    setFocusedOrganismId(id);
    adaptiveVisorDispatch({ type: 'focus-organism', organismId: id });
  }, []);
  const enterOrganism = useCallback((id: string) => {
    setFocusedOrganismId(id);
    setEnteredOrganismId(id);
    adaptiveVisorDispatch({ type: 'enter-organism', organismId: id });
  }, []);
  const exitOrganism = useCallback(() => {
    setEnteredOrganismId(null);
    adaptiveVisorDispatch({ type: 'exit-organism' });
  }, []);
  const enterMap = useCallback((mapId: string, label: string) => {
    setFocusedOrganismId(null);
    setEnteredOrganismId(null);
    dispatch({ type: 'ENTER_MAP', mapId, label });
    adaptiveVisorDispatch({ type: 'enter-map' });
  }, []);
  const exitMap = useCallback(() => {
    setFocusedOrganismId(null);
    setEnteredOrganismId(null);
    dispatch({ type: 'EXIT_MAP' });
    adaptiveVisorDispatch({ type: 'focus-organism', organismId: null });
  }, []);
  const navigateToMap = useCallback((mapId: string) => {
    setFocusedOrganismId(null);
    setEnteredOrganismId(null);
    dispatch({ type: 'NAVIGATE_TO_MAP', mapId });
    adaptiveVisorDispatch({ type: 'focus-organism', organismId: null });
  }, []);
  const openInVisor = useCallback(
    (id: string) => adaptiveVisorDispatch({ type: 'open-visor-organism', organismId: id }),
    [],
  );
  const closeVisorOrganism = useCallback(() => adaptiveVisorDispatch({ type: 'close-visor-organism' }), []);
  const setAltitude = useCallback((altitude: Altitude) => {
    dispatch({ type: 'SET_ALTITUDE', altitude });
    adaptiveVisorDispatch({ type: 'set-altitude', altitude });
  }, []);
  const setViewportCenter = useCallback((x: number, y: number) => dispatch({ type: 'SET_VIEWPORT_CENTER', x, y }), []);
  const bumpMapRefresh = useCallback(() => dispatch({ type: 'BUMP_MAP_REFRESH' }), []);
  const toggleMapPanel = useCallback((panelId: AdaptiveVisorMapPanelId) => {
    adaptiveVisorDispatch({ type: 'toggle-map-panel', panelId });
  }, []);
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
      focusedOrganismId,
      enteredOrganismId,
    }),
    [state.navigationStack, state.currentMapId, focusedOrganismId, enteredOrganismId],
  );

  const visorState = useMemo<PlatformVisorState>(
    () => ({
      visorOrganismId: adaptiveVisorState.visorOrganismId,
    }),
    [adaptiveVisorState.visorOrganismId],
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
      bumpMutationToken,
    }),
    [toggleMapPanel, bumpMutationToken],
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
