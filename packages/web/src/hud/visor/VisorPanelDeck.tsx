/**
 * VisorPanelDeck — shared adaptive panel deck for map and visor contexts.
 *
 * Resolves panel roles (main, secondary, collapsed) from panel schema and
 * renders promotion/collapse affordances with swap transitions.
 */

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fallbackMainPanel, resolveVisorPanelLayout } from './panel-layout-policy.js';
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
  title: string;
  template: VisorPanelDeckTemplate;
  surfaced: boolean;
  openTrunk: boolean;
  templateValuesReady?: boolean;
  preferredMainPanelId: HudPanelId | null;
  extraCollapsedChips?: ExtraCollapsedChip[];
  onPromotePanel: (panelId: HudPanelId) => void;
  onCollapseMainPanel: (panelId: HudPanelId, fallbackPanelId: HudPanelId | null) => void;
  renderPanelBody: (panelId: HudPanelId) => ReactNode;
  renderSecondaryPreview?: (panelId: HudPanelId) => ReactNode;
}

export function VisorPanelDeck({
  title,
  template,
  surfaced,
  openTrunk,
  templateValuesReady = false,
  preferredMainPanelId,
  extraCollapsedChips = [],
  onPromotePanel,
  onCollapseMainPanel,
  renderPanelBody,
  renderSecondaryPreview,
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
        context: { contextClass: template.contextClass, surfaced, openTrunk, templateValuesReady },
        preferredMainPanelId,
        slots: template.panelSlots,
      }),
    [template, surfaced, openTrunk, templateValuesReady, preferredMainPanelId],
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

  function collapseMainPanel(panelId: HudPanelId) {
    const fallback = fallbackMainPanel([...layout.secondaryPanelIds, ...layout.collapsedPanelIds]);
    onCollapseMainPanel(panelId, fallback);
  }

  const mainPanelId = displayedMainPanelId ?? layout.mainPanelId;

  return (
    <div className={`visor-panel-deck visor-panel-deck--${template.contextClass} visor-panel-deck--${swapPhase}`}>
      <div className="visor-panel-deck-header">
        <span className="hud-info-label">{title}</span>
      </div>

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
                  onClick={() => collapseMainPanel(mainPanelId)}
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
            <button
              key={panelId}
              type="button"
              className="visor-panel-secondary-card"
              onClick={() => onPromotePanel(panelId)}
              title={`Promote ${getHudPanelDefinition(panelId).label} to main panel`}
            >
              <span className="visor-panel-secondary-title">{getHudPanelDefinition(panelId).label}</span>
              <span className="visor-panel-secondary-action">Open main</span>
              {renderSecondaryPreview ? (
                <span className="visor-panel-secondary-preview">{renderSecondaryPreview(panelId)}</span>
              ) : null}
            </button>
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
