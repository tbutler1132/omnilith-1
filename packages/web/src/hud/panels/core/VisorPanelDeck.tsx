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
  extraCollapsedChips?: ExtraCollapsedChip[];
  onPromotePanel: (panelId: HudPanelId) => void;
  onCollapseMainPanel: (panelId: HudPanelId) => void;
  renderPanelBody: (panelId: HudPanelId) => ReactNode;
  renderSecondaryBody?: (panelId: HudPanelId) => ReactNode;
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
  extraCollapsedChips = [],
  onPromotePanel,
  onCollapseMainPanel,
  renderPanelBody,
  renderSecondaryBody,
}: VisorPanelDeckProps) {
  const SWAP_EXIT_MS = 180;
  const SWAP_ENTER_MS = 260;
  const [displayedMainPanelId, setDisplayedMainPanelId] = useState<HudPanelId | null>(null);
  const [swapPhase, setSwapPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const exitTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);

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

  useEffect(
    () => () => {
      if (exitTimerRef.current != null) window.clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current != null) window.clearTimeout(enterTimerRef.current);
    },
    [],
  );

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

  const mainPanelId = displayedMainPanelId ?? layout.mainPanelId;

  return (
    <div className={`visor-panel-deck visor-panel-deck--${template.contextClass} visor-panel-deck--${swapPhase}`}>
      {title && (
        <div className="visor-panel-deck-header">
          <span className="hud-info-label">{title}</span>
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
