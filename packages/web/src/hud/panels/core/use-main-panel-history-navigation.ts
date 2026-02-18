/**
 * Main panel history navigation hook — tracks and navigates promoted main panels.
 *
 * Keeps a bounded history of main panel promotions for one visor context so
 * history-navigation widgets can move backward and forward without coupling to
 * panel deck rendering details.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HudContextClass, HudPanelId } from './panel-schema.js';

interface MainNavState {
  history: HudPanelId[];
  index: number;
}

interface MainPanelHistoryTarget {
  index: number;
  panelId: HudPanelId;
}

interface UseMainPanelHistoryNavigationInput {
  contextClass: HudContextClass;
  currentMainPanelId: HudPanelId | null;
  availablePanelIds: HudPanelId[];
  enabled: boolean;
  onPromotePanel: (panelId: HudPanelId) => void;
}

export interface MainPanelHistoryNavigation {
  hasTargets: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goPrevious: () => void;
  goNext: () => void;
}

function findHistoryTarget(
  navState: MainNavState,
  availablePanelIds: HudPanelId[],
  direction: -1 | 1,
): MainPanelHistoryTarget | null {
  const available = new Set(availablePanelIds);
  let idx = navState.index + direction;

  while (idx >= 0 && idx < navState.history.length) {
    const panelId = navState.history[idx];
    if (available.has(panelId)) return { index: idx, panelId };
    idx += direction;
  }

  return null;
}

export function useMainPanelHistoryNavigation({
  contextClass,
  currentMainPanelId,
  availablePanelIds,
  enabled,
  onPromotePanel,
}: UseMainPanelHistoryNavigationInput): MainPanelHistoryNavigation {
  const [mainNav, setMainNav] = useState<MainNavState>({ history: [], index: -1 });
  const contextClassRef = useRef(contextClass);

  useEffect(() => {
    const contextChanged = contextClassRef.current !== contextClass;
    if (contextChanged) contextClassRef.current = contextClass;

    setMainNav((currentNav) => {
      if (contextChanged) {
        return currentMainPanelId ? { history: [currentMainPanelId], index: 0 } : { history: [], index: -1 };
      }

      if (!currentMainPanelId) return currentNav;
      if (currentNav.index >= 0 && currentNav.history[currentNav.index] === currentMainPanelId) return currentNav;

      const baseHistory = currentNav.index >= 0 ? currentNav.history.slice(0, currentNav.index + 1) : [];
      if (baseHistory[baseHistory.length - 1] === currentMainPanelId) {
        return { history: baseHistory, index: baseHistory.length - 1 };
      }

      const withCurrent = [...baseHistory, currentMainPanelId];
      if (withCurrent.length <= 24) {
        return { history: withCurrent, index: withCurrent.length - 1 };
      }

      const trimmed = withCurrent.slice(withCurrent.length - 24);
      return { history: trimmed, index: trimmed.length - 1 };
    });
  }, [contextClass, currentMainPanelId]);

  const previousTarget = useMemo(() => findHistoryTarget(mainNav, availablePanelIds, -1), [mainNav, availablePanelIds]);
  const nextTarget = useMemo(() => findHistoryTarget(mainNav, availablePanelIds, 1), [mainNav, availablePanelIds]);

  const goPrevious = useCallback(() => {
    if (!enabled || !previousTarget) return;
    setMainNav((currentNav) => ({ ...currentNav, index: previousTarget.index }));
    onPromotePanel(previousTarget.panelId);
  }, [enabled, previousTarget, onPromotePanel]);

  const goNext = useCallback(() => {
    if (!enabled || !nextTarget) return;
    setMainNav((currentNav) => ({ ...currentNav, index: nextTarget.index }));
    onPromotePanel(nextTarget.panelId);
  }, [enabled, nextTarget, onPromotePanel]);

  return {
    hasTargets: enabled && Boolean(previousTarget || nextTarget),
    canGoPrevious: enabled && Boolean(previousTarget),
    canGoNext: enabled && Boolean(nextTarget),
    goPrevious,
    goNext,
  };
}
