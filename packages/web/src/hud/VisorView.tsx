/**
 * VisorView — organism tending through the adaptive panel deck.
 *
 * The organism rendering is modeled as the "Tend" panel and shares the
 * same promotion/collapse behavior as universal visor panels.
 */

import { useState } from 'react';
import { surfaceOnWorldMap } from '../api/surface.js';
import { useIsSurfaced } from '../hooks/use-is-surfaced.js';
import { useOrganism } from '../hooks/use-organism.js';
import { ProposeForm } from '../organisms/ProposeForm.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformStaticState,
  usePlatformViewportMeta,
} from '../platform/index.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import type { HudPanelId, VisorHudPanelId } from './visor/panel-schema.js';
import { resolvePanelVisorTemplate } from './visor/template-schema.js';
import { VisorPanelBody } from './visor/VisorPanelBody.js';
import { VisorPanelDeck } from './visor/VisorPanelDeck.js';

interface VisorViewProps {
  organismId: string;
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

export function VisorView({ organismId }: VisorViewProps) {
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

  const proposeLabel = openTrunk ? 'Append State' : 'Open Proposal';

  const Renderer = organism?.currentState
    ? (getRenderer(organism.currentState.contentTypeId) ?? FallbackRenderer)
    : null;

  return (
    <div className="visor-view">
      <div className="visor-view-shell">
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
      </div>
    </div>
  );
}
