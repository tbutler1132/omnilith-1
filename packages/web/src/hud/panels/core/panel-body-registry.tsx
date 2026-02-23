/**
 * Panel body registry — typed body renderers for adaptive panel IDs.
 *
 * Keeps panel-body mapping in one contract so hosts and deck wrappers can
 * route by panel ID without per-host branching. Coverage is exhaustive by
 * panel ID type for map and universal visor panel groups.
 */

import type { ReactNode } from 'react';
import { renderProposalPanel } from '../../extensions/proposal-experience-registry.js';
import { HudMyProposalsPanel } from '../map/HudMyProposalsPanel.js';
import { HudProfilePanel } from '../map/HudProfilePanel.js';
import {
  AppendSection,
  BoundaryCadenceSection,
  CompositionSection,
  ContributionsSection,
  GovernanceSection,
  presentOrganismOverview,
  RegulationSection,
  RelationshipsSection,
  StateHistorySection,
} from '../organism/sections/index.js';
import type { MapHudPanelId, UniversalVisorHudPanelId, VisorMainHudPanelId } from './panel-schema.js';
import { PanelInfoAuthRequired, PanelInfoEmpty, PanelInfoError, PanelInfoLoading, PanelSection } from './panel-ux.js';

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
  currentContentTypeId?: string;
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
  regulation: (context) => <RegulationSection organismId={context.organismId} refreshKey={context.refreshKey} />,
  'boundary-cadence': (context) => (
    <BoundaryCadenceSection organismId={context.organismId} refreshKey={context.refreshKey} />
  ),
  propose: (context) => renderProposalPanel('propose', context),
  proposals: (context) => renderProposalPanel('proposals', context),
  append: (context) => (
    <AppendSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
  relationships: (context) => <RelationshipsSection organismId={context.organismId} />,
  contributions: (context) => <ContributionsSection organismId={context.organismId} refreshKey={context.refreshKey} />,
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
  childCountLabel: string;
  organismLoading: boolean;
  childrenLoading: boolean;
  organismError?: Error;
  childrenError?: Error;
  hasCurrentState: boolean;
  payload: unknown;
}

export function renderOrganismMainPanelBody(context: OrganismMainPanelBodyContext): ReactNode {
  const overview = presentOrganismOverview({
    organismLoading: context.organismLoading,
    childrenLoading: context.childrenLoading,
    organismError: context.organismError,
    childrenError: context.childrenError,
    hasCurrentState: context.hasCurrentState,
    payload: context.payload,
  });

  return (
    <div className="visor-organism-panel">
      <div className="visor-organism-panel-header">
        <div className="visor-organism-panel-info">
          <div className="visor-organism-tab-strip">
            <span className="visor-organism-tab visor-organism-tab--active">Overview</span>
          </div>
          <div className="visor-organism-overview-meta">
            <div className="visor-organism-overview-meta-row">
              <span className="visor-organism-overview-meta-label">Name:</span>
              <span className="visor-organism-overview-meta-value">{context.name}</span>
            </div>
            <div className="visor-organism-overview-meta-row">
              <span className="visor-organism-overview-meta-label">Content Type:</span>
              <span className="visor-organism-overview-meta-value">{context.contentType}</span>
            </div>
            <div className="visor-organism-overview-meta-row">
              <span className="visor-organism-overview-meta-label">Children:</span>
              <span className="visor-organism-overview-meta-value">{context.childCountLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="visor-organism-overview-body">
        {overview.status === 'loading' && <PanelInfoLoading label="Overview" message={overview.message} />}
        {overview.status === 'auth-required' && <PanelInfoAuthRequired label="Overview" message={overview.message} />}
        {overview.status === 'error' && <PanelInfoError label="Overview" message={overview.message} />}
        {overview.status === 'empty' && <PanelInfoEmpty label="Overview" message={overview.message} />}
        {overview.status === 'ready' && (
          <PanelSection label="Raw state payload">
            <pre className="visor-organism-overview-raw">{overview.rawPayload}</pre>
          </PanelSection>
        )}
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
  regulation: (context) => renderUniversalVisorPanelBody('regulation', context.universal),
  'boundary-cadence': (context) => renderUniversalVisorPanelBody('boundary-cadence', context.universal),
  propose: (context) => renderUniversalVisorPanelBody('propose', context.universal),
  proposals: (context) => renderUniversalVisorPanelBody('proposals', context.universal),
  append: (context) => renderUniversalVisorPanelBody('append', context.universal),
  relationships: (context) => renderUniversalVisorPanelBody('relationships', context.universal),
  contributions: (context) => renderUniversalVisorPanelBody('contributions', context.universal),
  history: (context) => renderUniversalVisorPanelBody('history', context.universal),
  governance: (context) => renderUniversalVisorPanelBody('governance', context.universal),
} satisfies Record<VisorMainHudPanelId, VisorPanelBodyRenderer>;

export function renderVisorPanelBody(panelId: VisorMainHudPanelId, context: VisorPanelBodyContext): ReactNode {
  return VISOR_MAIN_PANEL_BODY_RENDERERS[panelId](context);
}
