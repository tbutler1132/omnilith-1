/**
 * PlatformContext — shared state for the Space + Visor paradigm.
 *
 * Manages navigation (map stack), organism focus, and visor panel state.
 * All platform-level coordination flows through this context.
 */

import { createContext, type ReactNode, useContext, useReducer } from 'react';

export type VisorSection = 'here' | 'mine' | 'compose' | 'discover';

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

  /** Visor */
  visorOpen: boolean;
  visorSection: VisorSection;
}

type PlatformAction =
  | { type: 'FOCUS_ORGANISM'; id: string | null }
  | { type: 'ENTER_MAP'; mapId: string; label: string }
  | { type: 'EXIT_MAP' }
  | { type: 'NAVIGATE_TO_MAP'; mapId: string }
  | { type: 'OPEN_VISOR'; section?: VisorSection }
  | { type: 'CLOSE_VISOR' }
  | { type: 'TOGGLE_VISOR' }
  | { type: 'SET_VISOR_SECTION'; section: VisorSection };

function reducer(state: PlatformState, action: PlatformAction): PlatformState {
  switch (action.type) {
    case 'FOCUS_ORGANISM':
      return {
        ...state,
        focusedOrganismId: action.id,
        visorOpen: action.id !== null ? true : state.visorOpen,
        visorSection: action.id !== null ? 'here' : state.visorSection,
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
      return {
        ...state,
        visorOpen: true,
        visorSection: action.section ?? state.visorSection,
      };

    case 'CLOSE_VISOR':
      return { ...state, visorOpen: false };

    case 'TOGGLE_VISOR':
      return { ...state, visorOpen: !state.visorOpen };

    case 'SET_VISOR_SECTION':
      return { ...state, visorSection: action.section };
  }
}

interface PlatformContextValue {
  state: PlatformState;
  focusOrganism: (id: string | null) => void;
  enterMap: (mapId: string, label: string) => void;
  exitMap: () => void;
  navigateToMap: (mapId: string) => void;
  openVisor: (section?: VisorSection) => void;
  closeVisor: () => void;
  toggleVisor: () => void;
  setVisorSection: (section: VisorSection) => void;
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
  const [state, dispatch] = useReducer(reducer, {
    userId,
    personalOrganismId,
    homePageOrganismId,
    worldMapId,
    navigationStack: [{ mapId: worldMapId, label: 'World' }],
    currentMapId: worldMapId,
    focusedOrganismId: null,
    visorOpen: false,
    visorSection: 'here',
  });

  const value: PlatformContextValue = {
    state,
    focusOrganism: (id) => dispatch({ type: 'FOCUS_ORGANISM', id }),
    enterMap: (mapId, label) => dispatch({ type: 'ENTER_MAP', mapId, label }),
    exitMap: () => dispatch({ type: 'EXIT_MAP' }),
    navigateToMap: (mapId) => dispatch({ type: 'NAVIGATE_TO_MAP', mapId }),
    openVisor: (section) => dispatch({ type: 'OPEN_VISOR', section }),
    closeVisor: () => dispatch({ type: 'CLOSE_VISOR' }),
    toggleVisor: () => dispatch({ type: 'TOGGLE_VISOR' }),
    setVisorSection: (section) => dispatch({ type: 'SET_VISOR_SECTION', section }),
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
