/**
 * ComponentsSection — read-only list of composed child organisms.
 *
 * Used by renderer preview thermal mode to reveal which children are
 * currently available for rendered composition.
 */

import { useChildren, useOrganismsByIds } from '../../../../hooks/use-organism.js';
import { usePlatformActions } from '../../../../platform/index.js';
import { PanelInfoError, PanelInfoLoading, PanelSection } from '../../core/panel-ux.js';

interface ComponentsSectionProps {
  organismId: string;
  refreshKey: number;
  supportsRendererHotspots: boolean;
}

export function ComponentsSection({ organismId, refreshKey, supportsRendererHotspots }: ComponentsSectionProps) {
  const { openInVisor } = usePlatformActions();
  const { data: children, loading, error } = useChildren(organismId, refreshKey);
  const childIds = children?.map((child) => child.childId) ?? [];
  const { data: childDataById, loading: loadingChildren } = useOrganismsByIds(childIds, refreshKey);

  if (loading) {
    return <PanelInfoLoading label="Components" message="Loading composed children..." />;
  }

  if (error) {
    return <PanelInfoError label="Components" message="Failed to load composed children." />;
  }

  return (
    <PanelSection label="Components">
      {loadingChildren && childIds.length > 0 && <span className="hud-info-dim">Loading component details...</span>}

      {childIds.length === 0 ? (
        <>
          <span className="hud-info-dim">This organism is currently childless.</span>
          <span className="hud-info-dim">Thermal view has no child hotspots in this renderer.</span>
        </>
      ) : (
        <>
          {!supportsRendererHotspots && (
            <span className="hud-info-dim">This renderer currently does not emit child hotspots in thermal view.</span>
          )}
          {childIds.map((childId) => {
            const child = childDataById?.[childId];
            return (
              <div key={childId} className="hud-info-child-row">
                <button type="button" className="hud-info-child" onClick={() => openInVisor(childId)}>
                  <span className="hud-info-child-badge">{child?.currentState?.contentTypeId ?? '...'}</span>
                  <span className="hud-info-child-name">{child?.organism.name ?? childId.slice(0, 12)}</span>
                </button>
              </div>
            );
          })}
        </>
      )}
    </PanelSection>
  );
}
