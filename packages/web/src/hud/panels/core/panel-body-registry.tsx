/**
 * Panel body registry — typed body renderers for adaptive panel IDs.
 *
 * Keeps panel-body mapping in one contract so hosts and deck wrappers can
 * route by panel ID without per-host branching. Coverage is exhaustive by
 * panel ID type for map and universal visor panel groups.
 */

import type { ReactNode } from 'react';
import { HudMyProposalsPanel } from '../map/HudMyProposalsPanel.js';
import { HudProfilePanel } from '../map/HudProfilePanel.js';
import {
  AppendSection,
  CompositionSection,
  GovernanceSection,
  ProposalsSection,
  ProposeSection,
  RelationshipsSection,
  StateHistorySection,
} from '../organism/sections/index.js';
import type { MapHudPanelId, UniversalVisorHudPanelId, VisorMainHudPanelId } from './panel-schema.js';

type MapPanelBodyRenderer = () => ReactNode;

export const MAP_PANEL_BODY_RENDERERS = {
  profile: () => <HudProfilePanel />,
  'my-proposals': () => <HudMyProposalsPanel />,
} satisfies Record<MapHudPanelId, MapPanelBodyRenderer>;

export function renderMapPanelBody(panelId: MapHudPanelId): ReactNode {
  return MAP_PANEL_BODY_RENDERERS[panelId]();
}

interface UniversalVisorPanelBodyContext {
  organismId: string;
  refreshKey: number;
  canWrite: boolean;
  onMutate: () => void;
}

type UniversalVisorPanelBodyRenderer = (context: UniversalVisorPanelBodyContext) => ReactNode;

export const UNIVERSAL_VISOR_PANEL_BODY_RENDERERS = {
  composition: (context) => (
    <CompositionSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
  propose: (context) => (
    <ProposeSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
  proposals: (context) => (
    <ProposalsSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
  append: (context) => (
    <AppendSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
  relationships: (context) => <RelationshipsSection organismId={context.organismId} />,
  history: (context) => <StateHistorySection organismId={context.organismId} refreshKey={context.refreshKey} />,
  governance: (context) => <GovernanceSection organismId={context.organismId} />,
} satisfies Record<UniversalVisorHudPanelId, UniversalVisorPanelBodyRenderer>;

export function renderUniversalVisorPanelBody(
  panelId: UniversalVisorHudPanelId,
  context: UniversalVisorPanelBodyContext,
): ReactNode {
  return UNIVERSAL_VISOR_PANEL_BODY_RENDERERS[panelId](context);
}

interface OrganismMainPanelBodyContext {
  name: string;
  contentType: string;
  canWrite: boolean;
  openTrunk: boolean;
  surfaceLoading: boolean;
  surfaced: boolean;
  surfacing: boolean;
  organismRenderer: ReactNode;
  onOpenAppend: () => void;
  onOpenPropose: () => void;
  onOpenProposals: () => void;
  onCloseVisor: () => void;
  onVisit: () => void;
  onSurface: () => void;
  previewMode: 'thermal' | 'true-renderer';
  onSelectThermalPreview: () => void;
  onSelectTrueRendererPreview: () => void;
}

export function renderOrganismMainPanelBody(context: OrganismMainPanelBodyContext): ReactNode {
  return (
    <div className="visor-organism-panel">
      <div className="visor-organism-panel-header">
        <div className="visor-organism-panel-info">
          <span className="content-type">{context.contentType}</span>
          <h3 className="hud-info-name">{context.name}</h3>
        </div>

        <div className="visor-organism-panel-controls">
          <fieldset className="visor-renderer-preview-toggle" aria-label="Renderer preview mode">
            <button
              type="button"
              className={`hud-action-btn ${context.previewMode === 'thermal' ? 'hud-action-btn--active' : ''}`}
              onClick={context.onSelectThermalPreview}
            >
              Thermal view
            </button>
            <button
              type="button"
              className={`hud-action-btn ${context.previewMode === 'true-renderer' ? 'hud-action-btn--active' : ''}`}
              onClick={context.onSelectTrueRendererPreview}
            >
              Renderer view
            </button>
          </fieldset>

          {context.canWrite && context.openTrunk && (
            <button type="button" className="hud-action-btn" onClick={context.onOpenAppend}>
              Append
            </button>
          )}

          {context.canWrite && !context.openTrunk && (
            <button type="button" className="hud-action-btn" onClick={context.onOpenPropose}>
              Propose
            </button>
          )}

          {!context.openTrunk && (
            <button type="button" className="hud-action-btn" onClick={context.onOpenProposals}>
              Proposals
            </button>
          )}

          <button type="button" className="visor-view-close" onClick={context.onCloseVisor} aria-label="Close">
            &times;
          </button>
        </div>
      </div>

      <div className={`visor-view-renderer visor-view-renderer--${context.previewMode}`}>
        {context.organismRenderer}
      </div>

      <div className="visor-view-actions">
        {!context.surfaceLoading && context.surfaced && (
          <button type="button" className="hud-action-btn" onClick={context.onVisit}>
            Visit
          </button>
        )}

        {context.canWrite && !context.surfaceLoading && !context.surfaced && (
          <button type="button" className="hud-action-btn" onClick={context.onSurface} disabled={context.surfacing}>
            {context.surfacing ? 'Surfacing...' : 'Surface'}
          </button>
        )}
        {!context.canWrite && <span className="hud-info-dim">Log in to tend this organism.</span>}
      </div>
    </div>
  );
}

interface VisorPanelBodyContext {
  organismMain: OrganismMainPanelBodyContext;
  universal: UniversalVisorPanelBodyContext;
}

type VisorPanelBodyRenderer = (context: VisorPanelBodyContext) => ReactNode;

export const VISOR_MAIN_PANEL_BODY_RENDERERS = {
  organism: (context) => renderOrganismMainPanelBody(context.organismMain),
  composition: (context) => renderUniversalVisorPanelBody('composition', context.universal),
  propose: (context) => renderUniversalVisorPanelBody('propose', context.universal),
  proposals: (context) => renderUniversalVisorPanelBody('proposals', context.universal),
  append: (context) => renderUniversalVisorPanelBody('append', context.universal),
  relationships: (context) => renderUniversalVisorPanelBody('relationships', context.universal),
  history: (context) => renderUniversalVisorPanelBody('history', context.universal),
  governance: (context) => renderUniversalVisorPanelBody('governance', context.universal),
} satisfies Record<VisorMainHudPanelId, VisorPanelBodyRenderer>;

export function renderVisorPanelBody(panelId: VisorMainHudPanelId, context: VisorPanelBodyContext): ReactNode {
  return VISOR_MAIN_PANEL_BODY_RENDERERS[panelId](context);
}
