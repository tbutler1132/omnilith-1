/**
 * AdaptiveVisorHost — unified adaptive rendering host across visor contexts.
 *
 * In adaptive mode, panel rendering flows through one context-driven host
 * so map and organism interactions share the same panel mechanics and
 * collapsed rail placement rules.
 */

import { useOrganism } from '../hooks/use-organism.js';
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
import { resolveVisorPanelLayout } from './panels/core/panel-layout-policy.js';
import {
  isInteriorHudPanelId,
  isMapHudPanelId,
  isToggleMapHudPanelId,
  type MapHudPanelId,
} from './panels/core/panel-schema.js';
import { resolvePanelVisorTemplate } from './panels/core/template-schema.js';
import { useMainPanelHistoryNavigation } from './panels/core/use-main-panel-history-navigation.js';
import { VisorPanelDeck } from './panels/core/VisorPanelDeck.js';
import { OrganismPanelDeck } from './panels/organism/OrganismPanelDeck.js';
import { CompassWidget, HistoryNavigationWidget, MapLegendWidget, VisorWidgetLane } from './widgets/index.js';

type MapPanelId = MapHudPanelId | null;

export function AdaptiveVisorHost() {
  const { currentMapId, focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOrganismId, visorPanelIntent } = usePlatformVisorState();
  const { canWrite } = usePlatformStaticState();
  const { openInVisor } = usePlatformActions();
  const adaptiveState = usePlatformAdaptiveVisorState();
  const adaptiveActions = usePlatformAdaptiveVisorActions();
  const { data: currentMapData } = useOrganism(currentMapId);

  const mapTemplate = resolvePanelVisorTemplate('map');
  const interiorTemplate = resolvePanelVisorTemplate('interior');

  const contextClass = adaptiveState.layoutContext.contextClass;
  const isSpatialMap = currentMapData?.currentState?.contentTypeId === 'spatial-map';
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
  const mapShowsLegend =
    contextClass === 'map' &&
    isSpatialMap &&
    activeWidgets.has('map-legend') &&
    mapTemplate.widgetSlots.allowedWidgets.includes('map-legend');
  const mapLayout = resolveVisorPanelLayout({
    context: {
      contextClass: 'map',
      surfaced: false,
      openTrunk: false,
      templateValuesReady: false,
      canWrite,
    },
    preferredMainPanelId: activeMapPanel,
    slots: mapTemplate.panelSlots,
  });
  const mapHistoryNavigation = useMainPanelHistoryNavigation({
    contextClass,
    currentMainPanelId: contextClass === 'map' ? mapLayout.mainPanelId : null,
    availablePanelIds: contextClass === 'map' ? mapLayout.availablePanelIds : [],
    enabled: mapHistoryNavigationEnabled,
    onPromotePanel: (panelId) => {
      if (isToggleMapHudPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
    },
  });
  const mapShowsHistoryNavigation = contextClass === 'map' && mapHistoryNavigation.hasTargets;

  return (
    <div className="adaptive-visor-surface">
      {(mapShowsCompass || mapShowsLegend || mapShowsHistoryNavigation) && (
        <VisorWidgetLane>
          {mapShowsCompass && <CompassWidget />}
          {mapShowsLegend && <MapLegendWidget />}
          {mapShowsHistoryNavigation && (
            <HistoryNavigationWidget
              canGoPrevious={mapHistoryNavigation.canGoPrevious}
              canGoNext={mapHistoryNavigation.canGoNext}
              onGoPrevious={mapHistoryNavigation.goPrevious}
              onGoNext={mapHistoryNavigation.goNext}
            />
          )}
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
                    onClick: () => openInVisor(focusedOrganismId, 'proposals'),
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
          renderPanelBody={(panelId) => {
            if (!isMapHudPanelId(panelId)) return null;
            return renderMapPanelBody(panelId);
          }}
        />
      )}

      {contextClass === 'visor-organism' && visorOrganismId && adaptiveState.activePanels.includes('visor-view') && (
        <OrganismPanelDeck key={visorOrganismId} organismId={visorOrganismId} initialPanelId={visorPanelIntent} />
      )}

      {contextClass === 'interior' && enteredOrganismId && adaptiveState.activePanels.includes('interior-actions') && (
        <VisorPanelDeck
          template={interiorTemplate}
          surfaced={false}
          openTrunk={false}
          canWrite={canWrite}
          preferredMainPanelId={null}
          extraCollapsedChips={
            enteredOrganismId
              ? [
                  {
                    id: `overview-${enteredOrganismId}`,
                    label: 'Overview',
                    title: 'Open overview panel',
                    onClick: () => openInVisor(enteredOrganismId, 'organism'),
                  },
                  {
                    id: `regulation-${enteredOrganismId}`,
                    label: 'Regulation',
                    title: 'Open regulation panel',
                    onClick: () => openInVisor(enteredOrganismId, 'regulation'),
                  },
                ]
              : []
          }
          onPromotePanel={(panelId) => {
            if (!isInteriorHudPanelId(panelId)) return;
            openInVisor(enteredOrganismId, 'proposals');
          }}
          onCollapseMainPanel={() => undefined}
          renderPanelBody={() => null}
        />
      )}
    </div>
  );
}
