/**
 * VisorView — the independent organism tending interface inside the Visor.
 *
 * Opens any organism regardless of spatial position. Shows the content-type
 * renderer in the main area with a collapsible sidebar containing all
 * universal layer sections. Provides Visit (surfaced) or Surface (not yet
 * on map) actions.
 */

import { useState } from 'react';
import { surfaceOnWorldMap } from '../api/surface.js';
import { useIsSurfaced } from '../hooks/use-is-surfaced.js';
import { useOrganism } from '../hooks/use-organism.js';
import { ProposeForm } from '../organisms/ProposeForm.js';
import { usePlatform } from '../platform/PlatformContext.js';
import { FallbackRenderer, getRenderer } from '../renderers/index.js';
import {
  CompositionSection,
  GovernanceSection,
  ProposalsSection,
  StateHistorySection,
  VitalitySection,
} from './sections/index.js';

interface VisorViewProps {
  organismId: string;
}

export function VisorView({ organismId }: VisorViewProps) {
  const { state, closeVisor, closeVisorOrganism, focusOrganism, bumpMapRefresh } = usePlatform();
  const { data: organism } = useOrganism(organismId);
  const { surfaced, loading: surfaceLoading } = useIsSurfaced(organismId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [surfacing, setSurfacing] = useState(false);

  const name = organism?.organism.name ?? '...';
  const contentType = organism?.currentState?.contentTypeId ?? '...';
  const openTrunk = organism?.organism.openTrunk ?? false;

  function handleVisit() {
    focusOrganism(organismId);
    closeVisor();
  }

  async function handleSurface() {
    setSurfacing(true);
    try {
      await surfaceOnWorldMap(state.worldMapId, organismId, state.viewportCenter.x, state.viewportCenter.y);
      bumpMapRefresh();
    } finally {
      setSurfacing(false);
    }
  }

  function handleProposed() {
    setRefreshKey((k) => k + 1);
    setShowProposeForm(false);
  }

  const proposeLabel = openTrunk ? 'Append State' : 'Open Proposal';

  // Content-type renderer
  const Renderer = organism?.currentState
    ? (getRenderer(organism.currentState.contentTypeId) ?? FallbackRenderer)
    : null;

  return (
    <div className="visor-view">
      <div className="visor-view-content">
        <div className="visor-view-header">
          <div className="visor-view-header-info">
            <span className="content-type">{contentType}</span>
            <h3 className="hud-info-name">{name}</h3>
          </div>
          <button type="button" className="visor-view-close" onClick={closeVisorOrganism} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="visor-view-renderer">
          {Renderer && organism?.currentState && <Renderer state={organism.currentState} zoom={1} focused={false} />}
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

      <div className={`visor-sidebar ${sidebarCollapsed ? 'visor-sidebar--collapsed' : ''}`}>
        <button
          type="button"
          className="visor-sidebar-toggle"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? '\u25C0' : '\u25B6'}
        </button>

        {!sidebarCollapsed && (
          <>
            {!showProposeForm && (
              <button type="button" className="hud-action-btn" onClick={() => setShowProposeForm(true)}>
                {proposeLabel}
              </button>
            )}

            {showProposeForm && organism?.currentState && (
              <ProposeForm
                organismId={organismId}
                currentContentTypeId={organism.currentState.contentTypeId}
                openTrunk={openTrunk}
                onComplete={handleProposed}
                onClose={() => setShowProposeForm(false)}
              />
            )}

            <VitalitySection organismId={organismId} refreshKey={refreshKey} />
            <CompositionSection organismId={organismId} refreshKey={refreshKey} />
            <ProposalsSection organismId={organismId} refreshKey={refreshKey} />
            <StateHistorySection organismId={organismId} refreshKey={refreshKey} />
            <GovernanceSection organismId={organismId} />
          </>
        )}
      </div>
    </div>
  );
}
