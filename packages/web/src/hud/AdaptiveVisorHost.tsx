/**
 * AdaptiveVisorHost — unified adaptive rendering host across visor contexts.
 *
 * In adaptive mode, panel rendering flows through one context-driven host
 * so map and organism interactions share the same panel mechanics and
 * collapsed rail placement rules.
 */

import { selectActiveMapPanel } from '../platform/adaptive-visor-compositor.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformStaticState,
  usePlatformVisorState,
} from '../platform/index.js';
import { renderMapPanelBody } from './panels/core/panel-body-registry.js';
import {
  isInteriorHudPanelId,
  isMapHudPanelId,
  isToggleMapHudPanelId,
  type MapHudPanelId,
} from './panels/core/panel-schema.js';
import { resolvePanelVisorTemplate } from './panels/core/template-schema.js';
import { VisorPanelDeck } from './panels/core/VisorPanelDeck.js';
import { OrganismPanelDeck } from './panels/organism/OrganismPanelDeck.js';
import { CompassWidget, VisorWidgetLane } from './widgets/index.js';

type MapPanelId = MapHudPanelId | null;

export function AdaptiveVisorHost() {
  const { focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOrganismId } = usePlatformVisorState();
  const { canWrite } = usePlatformStaticState();
  const { openInVisor } = usePlatformActions();
  const adaptiveState = usePlatformAdaptiveVisorState();
  const adaptiveActions = usePlatformAdaptiveVisorActions();

  const mapTemplate = resolvePanelVisorTemplate('map');
  const interiorTemplate = resolvePanelVisorTemplate('interior');

  const contextClass = adaptiveState.layoutContext.contextClass;
  const activeMapPanel = selectActiveMapPanel(adaptiveState) as MapPanelId;
  const activeWidgets = new Set(adaptiveState.activeWidgets);
  const mapShowsCompass =
    contextClass === 'map' &&
    activeWidgets.has('compass') &&
    mapTemplate.widgetSlots.allowedWidgets.includes('compass');
  const mapHistoryNavigationEnabled =
    contextClass === 'map' &&
    activeWidgets.has('history-navigation') &&
    mapTemplate.widgetSlots.allowedWidgets.includes('history-navigation');

  return (
    <div className="adaptive-visor-surface">
      {mapShowsCompass && (
        <VisorWidgetLane>
          <CompassWidget />
        </VisorWidgetLane>
      )}

      {contextClass === 'map' && (
        <VisorPanelDeck
          title="Map panels"
          template={mapTemplate}
          surfaced={false}
          openTrunk={false}
          canWrite={canWrite}
          preferredMainPanelId={activeMapPanel}
          extraCollapsedChips={
            focusedOrganismId && adaptiveState.altitude === 'close'
              ? [
                  {
                    id: `tend-${focusedOrganismId}`,
                    label: 'Collaborate focused',
                    className: 'visor-panel-collapsed-chip--tend',
                    title: 'Collaborate on focused organism',
                    onClick: () => openInVisor(focusedOrganismId),
                  },
                ]
              : []
          }
          onPromotePanel={(panelId) => {
            if (isToggleMapHudPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          onCollapseMainPanel={(panelId) => {
            if (isToggleMapHudPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          historyNavigationEnabled={mapHistoryNavigationEnabled}
          renderPanelBody={(panelId) => {
            if (!isMapHudPanelId(panelId)) return null;
            return renderMapPanelBody(panelId);
          }}
        />
      )}

      {contextClass === 'visor-organism' && visorOrganismId && adaptiveState.activePanels.includes('visor-view') && (
        <OrganismPanelDeck organismId={visorOrganismId} />
      )}

      {contextClass === 'interior' && enteredOrganismId && adaptiveState.activePanels.includes('interior-actions') && (
        <VisorPanelDeck
          template={interiorTemplate}
          surfaced={false}
          openTrunk={false}
          canWrite={canWrite}
          preferredMainPanelId={null}
          onPromotePanel={(panelId) => {
            if (!isInteriorHudPanelId(panelId)) return;
            openInVisor(enteredOrganismId);
          }}
          onCollapseMainPanel={() => undefined}
          renderPanelBody={() => null}
        />
      )}
    </div>
  );
}
