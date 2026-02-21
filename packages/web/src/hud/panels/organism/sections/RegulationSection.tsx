/**
 * RegulationSection — lists visible regulatory organisms in one boundary.
 *
 * Shows direct children whose current state content types participate in
 * the regulator runtime: sensor, variable, response-policy, and action.
 */

import { useEffect, useMemo, useState } from 'react';
import { useChildren, useOrganismMarkersByIds } from '../../../../hooks/use-organism.js';
import { usePlatformActions } from '../../../../platform/index.js';
import { PanelInfoEmpty, PanelInfoError, PanelInfoLoading, PanelSection, PanelTabs } from '../../core/panel-ux.js';
import { groupRegulatoryChildrenByContentType, presentRegulatoryChildren } from './regulation-presenter.js';

interface RegulationSectionProps {
  organismId: string;
  refreshKey: number;
}

export function RegulationSection({ organismId, refreshKey }: RegulationSectionProps) {
  const { data: children, loading: childrenLoading, error: childrenError } = useChildren(organismId, refreshKey);
  const childIds = (children ?? []).map((child) => child.childId);
  const {
    data: markerDataById,
    loading: markerLoading,
    error: markerError,
  } = useOrganismMarkersByIds(childIds, refreshKey);
  const { openInVisor } = usePlatformActions();
  const regulatoryChildren = presentRegulatoryChildren(childIds, markerDataById);
  const regulatoryChildrenByContentType = useMemo(
    () => groupRegulatoryChildrenByContentType(regulatoryChildren),
    [regulatoryChildren],
  );
  const [activeContentTypeId, setActiveContentTypeId] = useState<string | undefined>(
    regulatoryChildrenByContentType[0]?.contentTypeId,
  );

  useEffect(() => {
    if (regulatoryChildrenByContentType.length === 0) {
      setActiveContentTypeId(undefined);
      return;
    }

    const hasActiveContentType = regulatoryChildrenByContentType.some(
      (contentTypeGroup) => contentTypeGroup.contentTypeId === activeContentTypeId,
    );
    if (hasActiveContentType) {
      return;
    }

    setActiveContentTypeId(regulatoryChildrenByContentType[0].contentTypeId);
  }, [activeContentTypeId, regulatoryChildrenByContentType]);

  if (childrenLoading || (childIds.length > 0 && markerDataById === undefined && markerLoading)) {
    return <PanelInfoLoading label="Regulation" message="Loading regulation..." />;
  }

  if (childrenError) {
    return <PanelInfoError label="Regulation" message="Failed to load composed children." />;
  }

  if (markerError && markerDataById === undefined) {
    return <PanelInfoError label="Regulation" message="Failed to load regulation children." />;
  }

  if (regulatoryChildren.length === 0) {
    return <PanelInfoEmpty label="Regulation" message="No regulatory children are visible in this boundary." />;
  }

  const activeChildren =
    regulatoryChildrenByContentType.find((group) => group.contentTypeId === activeContentTypeId)?.children ?? [];

  return (
    <PanelSection label="Regulation">
      <PanelTabs
        ariaLabel="Regulatory content type tabs"
        tabs={regulatoryChildrenByContentType.map((group) => ({
          id: group.contentTypeId,
          label: formatContentTypeLabel(group.contentTypeId),
          count: group.children.length,
        }))}
        activeTabId={activeContentTypeId ?? regulatoryChildrenByContentType[0].contentTypeId}
        onSelectTab={setActiveContentTypeId}
      />
      {activeChildren.map((child) => (
        <div key={child.childId} className="hud-info-child-row">
          <button type="button" className="hud-info-child" onClick={() => openInVisor(child.childId)}>
            <span className="hud-info-child-badge">{child.contentTypeId}</span>
            <span className="hud-info-child-name">{child.name}</span>
          </button>
        </div>
      ))}
    </PanelSection>
  );
}

function formatContentTypeLabel(contentTypeId: string): string {
  return contentTypeId
    .split('-')
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(' ');
}
