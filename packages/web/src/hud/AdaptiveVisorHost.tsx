/**
 * AdaptiveVisorHost — unified adaptive rendering host across visor contexts.
 *
 * In adaptive mode, panel rendering flows through one context-driven host
 * so map and organism interactions share the same panel mechanics and
 * collapsed rail placement rules.
 */

import { useState } from 'react';
import { selectActiveMapPanel } from '../platform/adaptive-visor-compositor.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformStaticState,
  usePlatformVisorState,
} from '../platform/index.js';
import { Compass } from './Compass.js';
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
import { VisorWidgetLane } from './panels/widgets/VisorWidgetLane.js';
import type { TemplateSongCustomization } from './template-values.js';

type MapPanelId = MapHudPanelId | null;

export function AdaptiveVisorHost() {
  const { focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOrganismId } = usePlatformVisorState();
  const { canWrite } = usePlatformStaticState();
  const { openInVisor, bumpMapRefresh } = usePlatformActions();
  const adaptiveState = usePlatformAdaptiveVisorState();
  const adaptiveActions = usePlatformAdaptiveVisorActions();

  const [templateCustomization, setTemplateCustomization] = useState<TemplateSongCustomization | null>(null);
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

  function closeActiveMapPanel() {
    if (!activeMapPanel) return;

    if (activeMapPanel === 'template-values') {
      adaptiveActions.closeTemporaryPanel();
      return;
    }

    adaptiveActions.toggleMapPanel(activeMapPanel);
  }

  function handleThresholdCreated(organismId: string) {
    adaptiveActions.bumpMutationToken();
    closeActiveMapPanel();
    openInVisor(organismId);
  }

  function handleOrganismSelect(organismId: string) {
    closeActiveMapPanel();
    openInVisor(organismId);
  }

  function handleTemplateInstantiated(organismId: string) {
    setTemplateCustomization(null);
    adaptiveActions.bumpMutationToken();
    closeActiveMapPanel();
    openInVisor(organismId);
    bumpMapRefresh();
  }

  function handleTemplateValuesRequested(customization: TemplateSongCustomization) {
    setTemplateCustomization(customization);
    adaptiveActions.openTemplateValuesPanel();
  }

  function closeTemplateValues() {
    setTemplateCustomization(null);
    adaptiveActions.closeTemporaryPanel();
  }

  return (
    <div className="adaptive-visor-surface">
      {mapShowsCompass && (
        <VisorWidgetLane>
          <Compass />
        </VisorWidgetLane>
      )}

      {contextClass === 'map' && (
        <VisorPanelDeck
          title="Map panels"
          template={mapTemplate}
          surfaced={false}
          openTrunk={false}
          canWrite={canWrite}
          templateValuesReady={templateCustomization !== null}
          preferredMainPanelId={activeMapPanel}
          extraCollapsedChips={
            focusedOrganismId
              ? [
                  {
                    id: `tend-${focusedOrganismId}`,
                    label: 'Tend focused',
                    className: 'visor-panel-collapsed-chip--tend',
                    title: 'Tend focused organism',
                    onClick: () => openInVisor(focusedOrganismId),
                  },
                ]
              : []
          }
          onPromotePanel={(panelId) => {
            if (panelId === 'template-values') {
              if (templateCustomization) adaptiveActions.openTemplateValuesPanel();
              return;
            }
            if (isToggleMapHudPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          onCollapseMainPanel={(panelId) => {
            if (panelId === 'template-values') {
              // Collapse should demote to the rail, not restore prior flow state.
              adaptiveActions.bumpMutationToken();
              adaptiveActions.closeTemporaryPanel();
              return;
            }
            if (isToggleMapHudPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          historyNavigationEnabled={mapHistoryNavigationEnabled}
          renderPanelBody={(panelId) => {
            if (!isMapHudPanelId(panelId)) return null;
            return renderMapPanelBody(panelId, {
              templateCustomization,
              onThresholdCreated: handleThresholdCreated,
              onCloseMapPanel: closeActiveMapPanel,
              onOrganismSelect: handleOrganismSelect,
              onTemplateInstantiated: handleTemplateInstantiated,
              onTemplateValuesRequested: handleTemplateValuesRequested,
              onCloseTemplateValues: closeTemplateValues,
            });
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
