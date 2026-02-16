/**
 * AdaptiveVisorHost — unified adaptive rendering host across visor contexts.
 *
 * In adaptive mode, panel rendering flows through one context-driven host
 * so map and organism interactions share the same panel mechanics and
 * collapsed rail placement rules.
 */

import { useState } from 'react';
import { surfaceOnWorldMap } from '../api/surface.js';
import { useIsSurfaced } from '../hooks/use-is-surfaced.js';
import { useOrganism } from '../hooks/use-organism.js';
import { ProposeForm } from '../organisms/ProposeForm.js';
import { ThresholdForm } from '../organisms/ThresholdForm.js';
import { selectActiveMapPanel } from '../platform/adaptive-visor-compositor.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformStaticState,
  usePlatformViewportMeta,
  usePlatformVisorState,
} from '../platform/index.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import { HudMyOrganisms } from './HudMyOrganisms.js';
import { HudTemplates } from './HudTemplates.js';
import { HudTemplateValuesPanel } from './HudTemplateValuesPanel.js';
import type { TemplateSongCustomization } from './template-values.js';
import type { HudPanelId, VisorHudPanelId } from './visor/panel-schema.js';
import { resolvePanelVisorTemplate, resolveVisorTemplate } from './visor/template-schema.js';
import { VisorPanelBody } from './visor/VisorPanelBody.js';
import { VisorPanelDeck } from './visor/VisorPanelDeck.js';

type MapPanelId = 'threshold' | 'mine' | 'templates' | 'template-values' | null;
type ToggleMapPanelId = 'threshold' | 'mine' | 'templates';

function isToggleMapPanelId(panelId: HudPanelId): panelId is ToggleMapPanelId {
  return panelId === 'threshold' || panelId === 'mine' || panelId === 'templates';
}

function isVisorHudPanelId(panelId: HudPanelId): panelId is VisorHudPanelId {
  return (
    panelId === 'organism' ||
    panelId === 'composition' ||
    panelId === 'vitality' ||
    panelId === 'proposals' ||
    panelId === 'history' ||
    panelId === 'governance'
  );
}

function isUniversalVisorPanelId(panelId: VisorHudPanelId): panelId is Exclude<VisorHudPanelId, 'organism'> {
  return panelId !== 'organism';
}

interface AdaptiveOrganismPanelsProps {
  organismId: string;
}

function AdaptiveOrganismPanels({ organismId }: AdaptiveOrganismPanelsProps) {
  const { worldMapId } = usePlatformStaticState();
  const { viewportCenter } = usePlatformViewportMeta();
  const { closeVisorOrganism, focusOrganism, bumpMapRefresh } = usePlatformActions();
  const { bumpMutationToken } = usePlatformAdaptiveVisorActions();

  const [refreshKey, setRefreshKey] = useState(0);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [surfacing, setSurfacing] = useState(false);
  const [preferredPanelId, setPreferredPanelId] = useState<VisorHudPanelId>('organism');
  const organismTemplate = resolvePanelVisorTemplate('visor-organism');

  const { data: organism } = useOrganism(organismId, refreshKey);
  const { surfaced, loading: surfaceLoading } = useIsSurfaced(organismId);

  const name = organism?.organism.name ?? '...';
  const contentType = organism?.currentState?.contentTypeId ?? '...';
  const openTrunk = organism?.organism.openTrunk ?? false;
  const proposeLabel = openTrunk ? 'Append State' : 'Open Proposal';

  const Renderer = organism?.currentState
    ? (getRenderer(organism.currentState.contentTypeId) ?? FallbackRenderer)
    : null;

  function handleVisit() {
    focusOrganism(organismId);
    closeVisorOrganism();
  }

  async function handleSurface() {
    setSurfacing(true);
    try {
      await surfaceOnWorldMap(worldMapId, organismId, viewportCenter.x, viewportCenter.y);
      bumpMapRefresh();
      bumpMutationToken();
    } finally {
      setSurfacing(false);
    }
  }

  function handleProposed() {
    setRefreshKey((k) => k + 1);
    setShowProposeForm(false);
    bumpMutationToken();
  }

  return (
    <VisorPanelDeck
      title="Organism panels"
      template={organismTemplate}
      surfaced={surfaced}
      openTrunk={openTrunk}
      preferredMainPanelId={preferredPanelId}
      onPromotePanel={(panelId) => {
        if (!isVisorHudPanelId(panelId)) return;
        setPreferredPanelId(panelId);
      }}
      onCollapseMainPanel={(panelId, fallbackPanelId) => {
        if (panelId === 'organism') {
          setShowProposeForm(false);
          closeVisorOrganism();
          return;
        }

        if (fallbackPanelId && isVisorHudPanelId(fallbackPanelId)) {
          setPreferredPanelId(fallbackPanelId);
          return;
        }

        setPreferredPanelId('organism');
      }}
      renderPanelBody={(panelId) => {
        if (panelId === 'organism') {
          return (
            <div className="visor-organism-panel">
              <div className="visor-organism-panel-header">
                <div className="visor-organism-panel-info">
                  <span className="content-type">{contentType}</span>
                  <h3 className="hud-info-name">{name}</h3>
                </div>

                <div className="visor-organism-panel-controls">
                  {!showProposeForm && (
                    <button type="button" className="hud-action-btn" onClick={() => setShowProposeForm(true)}>
                      {proposeLabel}
                    </button>
                  )}

                  <button
                    type="button"
                    className="visor-view-close"
                    onClick={() => {
                      setShowProposeForm(false);
                      closeVisorOrganism();
                    }}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {showProposeForm && organism?.currentState && (
                <div className="visor-organism-panel-propose">
                  <ProposeForm
                    organismId={organismId}
                    currentContentTypeId={organism.currentState.contentTypeId}
                    currentPayload={organism.currentState.payload}
                    openTrunk={openTrunk}
                    onComplete={handleProposed}
                    onClose={() => setShowProposeForm(false)}
                  />
                </div>
              )}

              <div className="visor-view-renderer">
                {Renderer && organism?.currentState && (
                  <Renderer state={organism.currentState} zoom={1} focused={false} />
                )}
              </div>

              <div className="visor-view-actions">
                {!surfaceLoading && surfaced && (
                  <button type="button" className="hud-action-btn" onClick={handleVisit}>
                    Visit
                  </button>
                )}

                {!surfaceLoading && !surfaced && (
                  <button type="button" className="hud-action-btn" onClick={handleSurface} disabled={surfacing}>
                    {surfacing ? 'Surfacing...' : 'Surface'}
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (isVisorHudPanelId(panelId) && isUniversalVisorPanelId(panelId)) {
          return (
            <VisorPanelBody
              panelId={panelId}
              organismId={organismId}
              refreshKey={refreshKey}
              onMutate={() => {
                setRefreshKey((k) => k + 1);
                bumpMutationToken();
              }}
            />
          );
        }

        return null;
      }}
    />
  );
}

export function AdaptiveVisorHost() {
  const { focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOrganismId } = usePlatformVisorState();
  const { openInVisor, bumpMapRefresh } = usePlatformActions();
  const adaptiveState = usePlatformAdaptiveVisorState();
  const adaptiveActions = usePlatformAdaptiveVisorActions();

  const [templateCustomization, setTemplateCustomization] = useState<TemplateSongCustomization | null>(null);
  const mapTemplate = resolvePanelVisorTemplate('map');
  const interiorTemplate = resolveVisorTemplate('interior');

  const contextClass = adaptiveState.layoutContext.contextClass;
  const activeMapPanel = selectActiveMapPanel(adaptiveState) as MapPanelId;

  function closeActiveMapPanel() {
    if (!activeMapPanel) return;

    if (activeMapPanel === 'template-values') {
      adaptiveActions.closeTemporaryPanel();
      return;
    }

    adaptiveActions.toggleMapPanel(activeMapPanel);
  }

  function handleThresholdCreated(organismId: string) {
    adaptiveActions.bumpMutationToken();
    closeActiveMapPanel();
    openInVisor(organismId);
  }

  function handleOrganismSelect(organismId: string) {
    closeActiveMapPanel();
    openInVisor(organismId);
  }

  function handleTemplateInstantiated(organismId: string) {
    setTemplateCustomization(null);
    adaptiveActions.bumpMutationToken();
    closeActiveMapPanel();
    openInVisor(organismId);
    bumpMapRefresh();
  }

  function handleTemplateValuesRequested(customization: TemplateSongCustomization) {
    setTemplateCustomization(customization);
    adaptiveActions.openTemplateValuesPanel();
  }

  function closeTemplateValues() {
    setTemplateCustomization(null);
    adaptiveActions.closeTemporaryPanel();
  }

  return (
    <div className="adaptive-visor-surface">
      {contextClass === 'map' && adaptiveState.activeWidgets.includes('map-actions') && (
        <VisorPanelDeck
          title="Map panels"
          template={mapTemplate}
          surfaced={false}
          openTrunk={false}
          templateValuesReady={templateCustomization !== null}
          preferredMainPanelId={activeMapPanel}
          extraCollapsedChips={
            focusedOrganismId
              ? [
                  {
                    id: `tend-${focusedOrganismId}`,
                    label: 'Tend focused',
                    className: 'visor-panel-collapsed-chip--tend',
                    title: 'Tend focused organism',
                    onClick: () => openInVisor(focusedOrganismId),
                  },
                ]
              : []
          }
          onPromotePanel={(panelId) => {
            if (panelId === 'template-values') {
              if (templateCustomization) adaptiveActions.openTemplateValuesPanel();
              return;
            }
            if (isToggleMapPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          onCollapseMainPanel={(panelId) => {
            if (panelId === 'template-values') {
              adaptiveActions.closeTemporaryPanel();
              return;
            }
            if (isToggleMapPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          renderPanelBody={(panelId) => {
            if (panelId === 'threshold') {
              return <ThresholdForm inline onCreated={handleThresholdCreated} onClose={closeActiveMapPanel} />;
            }

            if (panelId === 'mine') {
              return <HudMyOrganisms onSelect={handleOrganismSelect} />;
            }

            if (panelId === 'templates') {
              return (
                <HudTemplates
                  onTemplateInstantiated={handleTemplateInstantiated}
                  onTemplateValuesRequested={handleTemplateValuesRequested}
                />
              );
            }

            if (panelId === 'template-values' && templateCustomization) {
              return (
                <HudTemplateValuesPanel
                  customization={templateCustomization}
                  onCancel={closeTemplateValues}
                  onTemplateInstantiated={handleTemplateInstantiated}
                />
              );
            }

            return (
              <div className="hud-panel-empty">
                <span className="hud-info-dim">Select a template first to edit template values.</span>
              </div>
            );
          }}
        />
      )}

      {contextClass === 'visor-organism' && visorOrganismId && adaptiveState.activePanels.includes('visor-view') && (
        <AdaptiveOrganismPanels organismId={visorOrganismId} />
      )}

      {contextClass === 'interior' && enteredOrganismId && adaptiveState.activePanels.includes('interior-actions') && (
        <div
          className={`visor-panel-collapsed-rail visor-panel-collapsed-rail--${interiorTemplate.panelSlots.collapsed.placement}`}
        >
          <button
            type="button"
            className="visor-panel-collapsed-chip visor-panel-collapsed-chip--tend"
            onClick={() => openInVisor(enteredOrganismId)}
          >
            Tend current
          </button>
        </div>
      )}
    </div>
  );
}
