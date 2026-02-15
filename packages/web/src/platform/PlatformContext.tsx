/**
 * PlatformContext — shared state for the Space + HUD paradigm.
 *
 * Manages navigation (map stack), organism focus, visor toggle,
 * and current altitude. All platform-level coordination flows
 * through this context.
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useReducer } from 'react';
import type { Altitude } from '../space/viewport-math.js';

interface NavigationEntry {
  mapId: string;
  label: string;
}

export interface PlatformState {
  /** Immutable per session */
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

  /** Visor */
  visorOpen: boolean;
  visorOrganismId: string | null;

  /** Current altitude level (synced from Space viewport) */
  altitude: Altitude;

  /** Where the user is currently looking on the map */
  viewportCenter: { x: number; y: number };

  /** Incremented after surfacing to trigger spatial map refetch */
  mapRefreshKey: number;
}

type PlatformAction =
  | { type: 'FOCUS_ORGANISM'; id: string | null }
  | { type: 'ENTER_MAP'; mapId: string; label: string }
  | { type: 'EXIT_MAP' }
  | { type: 'NAVIGATE_TO_MAP'; mapId: string }
  | { type: 'OPEN_VISOR' }
  | { type: 'CLOSE_VISOR' }
  | { type: 'TOGGLE_VISOR' }
  | { type: 'OPEN_IN_VISOR'; id: string }
  | { type: 'CLOSE_VISOR_ORGANISM' }
  | { type: 'SET_ALTITUDE'; altitude: Altitude }
  | { type: 'ENTER_ORGANISM'; id: string }
  | { type: 'EXIT_ORGANISM' }
  | { type: 'SET_VIEWPORT_CENTER'; x: number; y: number }
  | { type: 'BUMP_MAP_REFRESH' };

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

    case 'OPEN_VISOR':
      return { ...state, visorOpen: true };

    case 'CLOSE_VISOR':
      return { ...state, visorOpen: false, visorOrganismId: null };

    case 'TOGGLE_VISOR':
      return state.visorOpen ? { ...state, visorOpen: false, visorOrganismId: null } : { ...state, visorOpen: true };

    case 'OPEN_IN_VISOR':
      return { ...state, visorOrganismId: action.id, visorOpen: true };

    case 'CLOSE_VISOR_ORGANISM':
      return { ...state, visorOrganismId: null };

    case 'SET_ALTITUDE':
      return { ...state, altitude: action.altitude };

    case 'ENTER_ORGANISM':
      return {
        ...state,
        enteredOrganismId: action.id,
        focusedOrganismId: action.id,
        visorOpen: false,
        visorOrganismId: null,
      };

    case 'EXIT_ORGANISM':
      return {
        ...state,
        enteredOrganismId: null,
      };

    case 'SET_VIEWPORT_CENTER':
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
  openVisor: () => void;
  closeVisor: () => void;
  toggleVisor: () => void;
  openInVisor: (id: string) => void;
  closeVisorOrganism: () => void;
  setAltitude: (altitude: Altitude) => void;
  setViewportCenter: (x: number, y: number) => void;
  bumpMapRefresh: () => void;
}

const Context = createContext<PlatformContextValue | null>(null);

interface PlatformProviderProps {
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
  worldMapId: string;
  children: ReactNode;
}

export function PlatformProvider({
  userId,
  personalOrganismId,
  homePageOrganismId,
  worldMapId,
  children,
}: PlatformProviderProps) {
  const initialOrganismId = new URLSearchParams(window.location.search).get('organism');

  const [state, dispatch] = useReducer(reducer, {
    userId,
    personalOrganismId,
    homePageOrganismId,
    worldMapId,
    navigationStack: [{ mapId: worldMapId, label: 'World' }],
    currentMapId: worldMapId,
    focusedOrganismId: null,
    enteredOrganismId: null,
    visorOpen: initialOrganismId !== null,
    visorOrganismId: initialOrganismId,
    altitude: 'high',
    viewportCenter: { x: 2500, y: 2500 },
    mapRefreshKey: 0,
  });

  const focusOrganism = useCallback((id: string | null) => dispatch({ type: 'FOCUS_ORGANISM', id }), []);
  const enterOrganism = useCallback((id: string) => dispatch({ type: 'ENTER_ORGANISM', id }), []);
  const exitOrganism = useCallback(() => dispatch({ type: 'EXIT_ORGANISM' }), []);
  const enterMap = useCallback((mapId: string, label: string) => dispatch({ type: 'ENTER_MAP', mapId, label }), []);
  const exitMap = useCallback(() => dispatch({ type: 'EXIT_MAP' }), []);
  const navigateToMap = useCallback((mapId: string) => dispatch({ type: 'NAVIGATE_TO_MAP', mapId }), []);
  const openVisor = useCallback(() => dispatch({ type: 'OPEN_VISOR' }), []);
  const closeVisor = useCallback(() => dispatch({ type: 'CLOSE_VISOR' }), []);
  const toggleVisor = useCallback(() => dispatch({ type: 'TOGGLE_VISOR' }), []);
  const openInVisor = useCallback((id: string) => dispatch({ type: 'OPEN_IN_VISOR', id }), []);
  const closeVisorOrganism = useCallback(() => dispatch({ type: 'CLOSE_VISOR_ORGANISM' }), []);
  const setAltitude = useCallback((altitude: Altitude) => dispatch({ type: 'SET_ALTITUDE', altitude }), []);
  const setViewportCenter = useCallback((x: number, y: number) => dispatch({ type: 'SET_VIEWPORT_CENTER', x, y }), []);
  const bumpMapRefresh = useCallback(() => dispatch({ type: 'BUMP_MAP_REFRESH' }), []);

  const value = useMemo<PlatformContextValue>(
    () => ({
      state,
      focusOrganism,
      enterOrganism,
      exitOrganism,
      enterMap,
      exitMap,
      navigateToMap,
      openVisor,
      closeVisor,
      toggleVisor,
      openInVisor,
      closeVisorOrganism,
      setAltitude,
      setViewportCenter,
      bumpMapRefresh,
    }),
    [
      state,
      focusOrganism,
      enterOrganism,
      exitOrganism,
      enterMap,
      exitMap,
      navigateToMap,
      openVisor,
      closeVisor,
      toggleVisor,
      openInVisor,
      closeVisorOrganism,
      setAltitude,
      setViewportCenter,
      bumpMapRefresh,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
