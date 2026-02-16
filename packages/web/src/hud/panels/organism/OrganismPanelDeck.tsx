/**
 * OrganismPanelDeck — shared organism tending panel deck.
 *
 * Encapsulates adaptive panel behavior for tending a single organism so
 * every visor context uses one consistent panel system.
 */

import { useState } from 'react';
import { surfaceOnWorldMap } from '../../../api/surface.js';
import { useIsSurfaced } from '../../../hooks/use-is-surfaced.js';
import { useOrganism } from '../../../hooks/use-organism.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformMapState,
  usePlatformStaticState,
  usePlatformViewportMeta,
} from '../../../platform/index.js';
import { FallbackRenderer, getRenderer } from '../../../renderers/index.js';
import type { HudPanelId, VisorHudPanelId } from '../core/panel-schema.js';
import { resolvePanelVisorTemplate } from '../core/template-schema.js';
import { VisorPanelBody } from '../core/VisorPanelBody.js';
import { VisorPanelDeck } from '../core/VisorPanelDeck.js';
import { VisorWidgetLane } from '../widgets/VisorWidgetLane.js';
import { VitalityWidget } from '../widgets/VitalityWidget.js';

interface OrganismPanelDeckProps {
  organismId: string;
}

function isVisorHudPanelId(panelId: HudPanelId): panelId is VisorHudPanelId {
  return (
    panelId === 'organism' ||
    panelId === 'composition' ||
    panelId === 'propose' ||
    panelId === 'proposals' ||
    panelId === 'append' ||
    panelId === 'history' ||
    panelId === 'governance'
  );
}

function isUniversalVisorPanelId(panelId: VisorHudPanelId): panelId is Exclude<VisorHudPanelId, 'organism'> {
  return panelId !== 'organism';
}

export function OrganismPanelDeck({ organismId }: OrganismPanelDeckProps) {
  const { worldMapId, canWrite } = usePlatformStaticState();
  const { enteredOrganismId } = usePlatformMapState();
  const { viewportCenter } = usePlatformViewportMeta();
  const { closeVisorOrganism, focusOrganism, bumpMapRefresh } = usePlatformActions();
  const { bumpMutationToken } = usePlatformAdaptiveVisorActions();

  const initialPanelId: VisorHudPanelId | null = enteredOrganismId === organismId ? 'organism' : null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [surfacing, setSurfacing] = useState(false);
  const [preferredPanelId, setPreferredPanelId] = useState<VisorHudPanelId | null>(initialPanelId);
  const organismTemplate = resolvePanelVisorTemplate('visor-organism');
  const vitalityWidgetEnabled = organismTemplate.widgetSlots.allowedWidgets.includes('vitality');

  const { data: organism } = useOrganism(organismId, refreshKey);
  const { surfaced, loading: surfaceLoading } = useIsSurfaced(organismId);

  const name = organism?.organism.name ?? '...';
  const contentType = organism?.currentState?.contentTypeId ?? '...';
  const openTrunk = organism?.organism.openTrunk ?? false;

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

  return (
    <>
      {vitalityWidgetEnabled && preferredPanelId !== null && (
        <VisorWidgetLane>
          <VitalityWidget organismId={organismId} refreshKey={refreshKey} />
        </VisorWidgetLane>
      )}

      <VisorPanelDeck
        title="Organism panels"
        template={organismTemplate}
        surfaced={surfaced}
        openTrunk={openTrunk}
        canWrite={canWrite}
        preferredMainPanelId={preferredPanelId}
        onPromotePanel={(panelId) => {
          if (!isVisorHudPanelId(panelId)) return;
          setPreferredPanelId(panelId);
        }}
        onCollapseMainPanel={() => {
          setPreferredPanelId(null);
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
                    {canWrite && openTrunk && (
                      <button type="button" className="hud-action-btn" onClick={() => setPreferredPanelId('append')}>
                        Append
                      </button>
                    )}

                    {canWrite && !openTrunk && (
                      <button type="button" className="hud-action-btn" onClick={() => setPreferredPanelId('propose')}>
                        Propose
                      </button>
                    )}

                    {!openTrunk && (
                      <button type="button" className="hud-action-btn" onClick={() => setPreferredPanelId('proposals')}>
                        Proposals
                      </button>
                    )}

                    <button
                      type="button"
                      className="visor-view-close"
                      onClick={() => {
                        closeVisorOrganism();
                      }}
                      aria-label="Close"
                    >
                      &times;
                    </button>
                  </div>
                </div>

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

                  {canWrite && !surfaceLoading && !surfaced && (
                    <button type="button" className="hud-action-btn" onClick={handleSurface} disabled={surfacing}>
                      {surfacing ? 'Surfacing...' : 'Surface'}
                    </button>
                  )}
                  {!canWrite && <span className="hud-info-dim">Log in to tend this organism.</span>}
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
                canWrite={canWrite}
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
    </>
  );
}
