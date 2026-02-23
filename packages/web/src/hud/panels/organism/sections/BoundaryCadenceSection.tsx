/**
 * BoundaryCadenceSection — tabbed Move 48 cadence panel for boundary tending.
 *
 * Surfaces composed cadence organisms (trajectory, variables, models, retros,
 * tasks, inbox) so stewards can open each cadence organism from one place.
 */

import { useEffect, useMemo, useState } from 'react';
import { useChildren, useOrganismMarkersByIds } from '../../../../hooks/use-organism.js';
import { usePlatformActions } from '../../../../platform/index.js';
import { PanelInfoEmpty, PanelInfoError, PanelInfoLoading, PanelSection, PanelTabs } from '../../core/panel-ux.js';
import {
  BOUNDARY_CADENCE_TABS,
  type BoundaryCadenceChild,
  type BoundaryCadenceTabId,
  groupBoundaryCadenceChildrenByTab,
  isBoundaryCadenceTabId,
  presentBoundaryCadenceChildren,
} from './boundary-cadence-presenter.js';
import { CadenceMarkdownPreview } from './cadence-markdown-preview.js';

interface BoundaryCadenceSectionProps {
  organismId: string;
  refreshKey: number;
}

const DEFAULT_TAB_ID: BoundaryCadenceTabId = 'variables';

function getPayloadContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const content = (payload as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

function buildCadencePreviewContent(payload: unknown): string | undefined {
  const content = getPayloadContent(payload);
  if (!content) {
    return undefined;
  }

  return content;
}

function renderCadenceChild(child: BoundaryCadenceChild, openInVisor: (id: string) => void) {
  const previewContent = buildCadencePreviewContent(child.payload);

  return (
    <div key={child.childId} className="hud-boundary-cadence-child">
      <button type="button" className="hud-info-child" onClick={() => openInVisor(child.childId)}>
        <span className="hud-info-child-badge">{child.contentTypeId ?? 'unknown'}</span>
        <span className="hud-info-child-name">{child.name}</span>
      </button>
      {previewContent ? (
        <div className="hud-boundary-cadence-preview">
          <CadenceMarkdownPreview content={previewContent} />
        </div>
      ) : (
        <span className="hud-boundary-cadence-preview-empty">Open this organism to tend the full cadence state.</span>
      )}
    </div>
  );
}

export function BoundaryCadenceSection({ organismId, refreshKey }: BoundaryCadenceSectionProps) {
  const { data: children, loading: childrenLoading, error: childrenError } = useChildren(organismId, refreshKey);
  const childIds = (children ?? []).map((child) => child.childId);
  const {
    data: markerDataById,
    loading: markerLoading,
    error: markerError,
  } = useOrganismMarkersByIds(childIds, refreshKey);
  const { openInVisor } = usePlatformActions();
  const hasPendingChildMarkers = childIds.some((childId) => markerDataById?.[childId] === undefined);

  const cadenceChildren = useMemo(
    () => presentBoundaryCadenceChildren(childIds, markerDataById),
    [childIds, markerDataById],
  );
  const cadenceChildrenByTab = useMemo(() => groupBoundaryCadenceChildrenByTab(cadenceChildren), [cadenceChildren]);

  const [activeTabId, setActiveTabId] = useState<BoundaryCadenceTabId>(DEFAULT_TAB_ID);

  useEffect(() => {
    if (cadenceChildrenByTab.some((entry) => entry.tabId === activeTabId && entry.children.length > 0)) {
      return;
    }

    const fallbackTab = cadenceChildrenByTab.find((entry) => entry.children.length > 0)?.tabId;
    setActiveTabId(fallbackTab ?? DEFAULT_TAB_ID);
  }, [activeTabId, cadenceChildrenByTab]);

  if (childrenLoading || (markerLoading && hasPendingChildMarkers)) {
    return <PanelInfoLoading label="Boundary cadence" message="Loading boundary cadence..." />;
  }

  if (childrenError) {
    return <PanelInfoError label="Boundary cadence" message="Failed to load composed children." />;
  }

  if (markerError && markerDataById === undefined) {
    return <PanelInfoError label="Boundary cadence" message="Failed to load cadence children." />;
  }

  if (cadenceChildren.length === 0) {
    return (
      <PanelInfoEmpty
        label="Boundary cadence"
        message="No Move 48 cadence organisms are visible in this boundary yet."
      />
    );
  }

  const activeTabChildren = cadenceChildrenByTab.find((entry) => entry.tabId === activeTabId)?.children ?? [];

  return (
    <PanelSection label="Boundary cadence">
      <PanelTabs
        ariaLabel="Boundary cadence tabs"
        tabs={BOUNDARY_CADENCE_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: cadenceChildrenByTab.find((entry) => entry.tabId === tab.id)?.children.length ?? 0,
        }))}
        activeTabId={activeTabId}
        onSelectTab={(tabId) => {
          if (!isBoundaryCadenceTabId(tabId)) {
            return;
          }
          setActiveTabId(tabId);
        }}
      />

      {activeTabChildren.length === 0 && (
        <span className="hud-boundary-cadence-empty">No cadence organism is composed for this tab yet.</span>
      )}
      {activeTabChildren.map((child) => renderCadenceChild(child, openInVisor))}
    </PanelSection>
  );
}
