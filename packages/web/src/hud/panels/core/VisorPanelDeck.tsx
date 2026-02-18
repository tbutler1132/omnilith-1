/**
 * VisorPanelDeck — shared adaptive panel deck for map and visor contexts.
 *
 * Resolves panel roles (main, secondary, collapsed) from panel schema and
 * renders promotion/collapse affordances with swap transitions.
 */

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveVisorPanelLayout } from './panel-layout-policy.js';
import { getHudPanelDefinition, type HudContextClass, type HudPanelId } from './panel-schema.js';
import type { VisorTemplateDefinition } from './template-schema.js';

interface ExtraCollapsedChip {
  id: string;
  label: string;
  title?: string;
  className?: string;
  onClick: () => void;
}

type VisorPanelDeckTemplate = VisorTemplateDefinition & { contextClass: HudContextClass };

interface VisorHistoryTarget {
  index: number;
  panelId: HudPanelId;
}

interface VisorPanelDeckProps {
  title?: string;
  template: VisorPanelDeckTemplate;
  surfaced: boolean;
  openTrunk: boolean;
  canWrite: boolean;
  interiorOrigin?: boolean;
  thermalRendererPreview?: boolean;
  rendererPreviewFullBleed?: boolean;
  templateValuesReady?: boolean;
  preferredMainPanelId: HudPanelId | null;
  historyNavigationEnabled?: boolean;
  extraCollapsedChips?: ExtraCollapsedChip[];
  onPromotePanel: (panelId: HudPanelId) => void;
  onCollapseMainPanel: (panelId: HudPanelId) => void;
  renderPanelBody: (panelId: HudPanelId) => ReactNode;
  renderSecondaryBody?: (panelId: HudPanelId) => ReactNode;
}

interface MainNavState {
  history: HudPanelId[];
  index: number;
}

function findHistoryTarget(
  navState: MainNavState,
  availablePanelIds: HudPanelId[],
  direction: -1 | 1,
): VisorHistoryTarget | null {
  const available = new Set(availablePanelIds);
  let idx = navState.index + direction;

  while (idx >= 0 && idx < navState.history.length) {
    const panelId = navState.history[idx];
    if (available.has(panelId)) return { index: idx, panelId };
    idx += direction;
  }

  return null;
}

export function VisorPanelDeck({
  title,
  template,
  surfaced,
  openTrunk,
  canWrite,
  interiorOrigin = false,
  thermalRendererPreview = false,
  rendererPreviewFullBleed = false,
  templateValuesReady = false,
  preferredMainPanelId,
  historyNavigationEnabled,
  extraCollapsedChips = [],
  onPromotePanel,
  onCollapseMainPanel,
  renderPanelBody,
  renderSecondaryBody,
}: VisorPanelDeckProps) {
  const SWAP_EXIT_MS = 180;
  const SWAP_ENTER_MS = 260;
  const [displayedMainPanelId, setDisplayedMainPanelId] = useState<HudPanelId | null>(null);
  const [mainNav, setMainNav] = useState<MainNavState>({ history: [], index: -1 });
  const [swapPhase, setSwapPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const exitTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const contextClassRef = useRef(template.contextClass);

  const layout = useMemo(
    () =>
      resolveVisorPanelLayout({
        context: {
          contextClass: template.contextClass,
          surfaced,
          openTrunk,
          templateValuesReady,
          canWrite,
          interiorOrigin,
          thermalRendererPreview,
          rendererPreviewFullBleed,
        },
        preferredMainPanelId,
        slots: template.panelSlots,
      }),
    [
      template,
      surfaced,
      openTrunk,
      canWrite,
      interiorOrigin,
      thermalRendererPreview,
      rendererPreviewFullBleed,
      templateValuesReady,
      preferredMainPanelId,
    ],
  );
  const historyWidgetEnabled =
    historyNavigationEnabled ?? template.widgetSlots.allowedWidgets.includes('history-navigation');
  const previousMainTarget = useMemo(() => findHistoryTarget(mainNav, layout.availablePanelIds, -1), [mainNav, layout]);
  const nextMainTarget = useMemo(() => findHistoryTarget(mainNav, layout.availablePanelIds, 1), [mainNav, layout]);

  useEffect(
    () => () => {
      if (exitTimerRef.current != null) window.clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current != null) window.clearTimeout(enterTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const currentMainPanelId = layout.mainPanelId;
    const contextChanged = contextClassRef.current !== template.contextClass;

    if (contextChanged) contextClassRef.current = template.contextClass;

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
  }, [layout.mainPanelId, template.contextClass]);

  useEffect(() => {
    const nextMainPanelId = layout.mainPanelId;
    if (nextMainPanelId === displayedMainPanelId) return;

    if (exitTimerRef.current != null) window.clearTimeout(exitTimerRef.current);
    if (enterTimerRef.current != null) window.clearTimeout(enterTimerRef.current);

    if (displayedMainPanelId == null) {
      setDisplayedMainPanelId(nextMainPanelId);
      if (nextMainPanelId) {
        setSwapPhase('entering');
        enterTimerRef.current = window.setTimeout(() => setSwapPhase('idle'), SWAP_ENTER_MS);
      } else {
        setSwapPhase('idle');
      }
      return;
    }

    setSwapPhase('exiting');
    exitTimerRef.current = window.setTimeout(() => {
      setDisplayedMainPanelId(nextMainPanelId);
      if (nextMainPanelId) {
        setSwapPhase('entering');
        enterTimerRef.current = window.setTimeout(() => setSwapPhase('idle'), SWAP_ENTER_MS);
      } else {
        setSwapPhase('idle');
      }
    }, SWAP_EXIT_MS);
  }, [layout.mainPanelId, displayedMainPanelId]);

  function handleHistoryNavigation(direction: -1 | 1) {
    const target = direction === -1 ? previousMainTarget : nextMainTarget;
    if (!target) return;

    setMainNav((currentNav) => ({ ...currentNav, index: target.index }));
    onPromotePanel(target.panelId);
  }

  const mainPanelId = displayedMainPanelId ?? layout.mainPanelId;

  return (
    <div className={`visor-panel-deck visor-panel-deck--${template.contextClass} visor-panel-deck--${swapPhase}`}>
      {title && (
        <div className="visor-panel-deck-header">
          <span className="hud-info-label">{title}</span>
        </div>
      )}

      {historyWidgetEnabled && (previousMainTarget || nextMainTarget) && (
        <div className="visor-history-nav" role="toolbar" aria-label="Visor history navigation">
          <button
            type="button"
            className="hud-action-btn visor-history-btn"
            onClick={() => handleHistoryNavigation(-1)}
            disabled={!previousMainTarget}
            aria-label="Previous panel"
            title="Previous panel"
          >
            {'<'}
          </button>
          <button
            type="button"
            className="hud-action-btn visor-history-btn"
            onClick={() => handleHistoryNavigation(1)}
            disabled={!nextMainTarget}
            aria-label="Next panel"
            title="Next panel"
          >
            {'>'}
          </button>
        </div>
      )}

      {mainPanelId && (
        <div className="visor-panel-main-slot">
          <div
            key={mainPanelId}
            className={`visor-panel-main ${
              swapPhase === 'exiting'
                ? 'visor-panel-main--exiting'
                : swapPhase === 'entering'
                  ? 'visor-panel-main--entering'
                  : ''
            }`}
          >
            <div className="visor-panel-main-header">
              <h4>{getHudPanelDefinition(mainPanelId).label}</h4>
              <div className="visor-panel-main-actions">
                <button
                  type="button"
                  className="hud-action-btn visor-panel-action-btn"
                  onClick={() => onCollapseMainPanel(mainPanelId)}
                >
                  Collapse
                </button>
              </div>
            </div>
            <div className="visor-panel-main-body">{renderPanelBody(mainPanelId)}</div>
          </div>
        </div>
      )}

      {layout.secondaryPanelIds.length > 0 && (
        <div className="visor-panel-secondary-row">
          {layout.secondaryPanelIds.map((panelId) => (
            <div key={panelId} className="visor-panel-secondary-card">
              <span className="visor-panel-secondary-title">{getHudPanelDefinition(panelId).label}</span>
              {renderSecondaryBody ? (
                <div className="visor-panel-secondary-body">{renderSecondaryBody(panelId)}</div>
              ) : null}
              {getHudPanelDefinition(panelId).roleSupport.main ? (
                <button
                  type="button"
                  className="hud-action-btn visor-panel-secondary-promote"
                  onClick={() => onPromotePanel(panelId)}
                  title={`Promote ${getHudPanelDefinition(panelId).label} to main panel`}
                >
                  Open main
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {(layout.collapsedPanelIds.length > 0 || extraCollapsedChips.length > 0) && (
        <div
          className={`visor-panel-collapsed-rail visor-panel-collapsed-rail--${template.panelSlots.collapsed.placement}`}
          role="toolbar"
          aria-label="Collapsed visor panels"
        >
          {extraCollapsedChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`visor-panel-collapsed-chip ${chip.className ?? ''}`.trim()}
              onClick={chip.onClick}
              title={chip.title ?? chip.label}
            >
              {chip.label}
            </button>
          ))}

          {layout.collapsedPanelIds.map((panelId) => (
            <button
              key={panelId}
              type="button"
              className="visor-panel-collapsed-chip"
              onClick={() => onPromotePanel(panelId)}
              title={`Promote ${getHudPanelDefinition(panelId).label} to main panel`}
            >
              {getHudPanelDefinition(panelId).label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
