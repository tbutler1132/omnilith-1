/**
 * AdaptiveVisorHost — unified adaptive rendering host across visor contexts.
 *
 * In adaptive mode, panel rendering flows through one context-driven host
 * so map and organism interactions share the same panel mechanics and
 * collapsed rail placement rules.
 */

import { useState } from 'react';
import { ThresholdForm } from '../organisms/ThresholdForm.js';
import { selectActiveMapPanel } from '../platform/adaptive-visor-compositor.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformVisorState,
} from '../platform/index.js';
import { HudMyOrganisms } from './HudMyOrganisms.js';
import { HudTemplates } from './HudTemplates.js';
import { HudTemplateValuesPanel } from './HudTemplateValuesPanel.js';
import { OrganismPanelDeck } from './OrganismPanelDeck.js';
import type { TemplateSongCustomization } from './template-values.js';
import type { HudPanelId } from './visor/panel-schema.js';
import { resolvePanelVisorTemplate } from './visor/template-schema.js';
import { VisorPanelDeck } from './visor/VisorPanelDeck.js';

type MapPanelId = 'threshold' | 'mine' | 'templates' | 'template-values' | null;
type ToggleMapPanelId = 'threshold' | 'mine' | 'templates';
type InteriorPanelId = 'interior-actions';

function isToggleMapPanelId(panelId: HudPanelId): panelId is ToggleMapPanelId {
  return panelId === 'threshold' || panelId === 'mine' || panelId === 'templates';
}

function isInteriorPanelId(panelId: HudPanelId): panelId is InteriorPanelId {
  return panelId === 'interior-actions';
}

export function AdaptiveVisorHost() {
  const { focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOrganismId } = usePlatformVisorState();
  const { openInVisor, bumpMapRefresh } = usePlatformActions();
  const adaptiveState = usePlatformAdaptiveVisorState();
  const adaptiveActions = usePlatformAdaptiveVisorActions();

  const [templateCustomization, setTemplateCustomization] = useState<TemplateSongCustomization | null>(null);
  const mapTemplate = resolvePanelVisorTemplate('map');
  const interiorTemplate = resolvePanelVisorTemplate('interior');

  const contextClass = adaptiveState.layoutContext.contextClass;
  const activeMapPanel = selectActiveMapPanel(adaptiveState) as MapPanelId;

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
      {contextClass === 'map' && adaptiveState.activeWidgets.includes('map-actions') && (
        <VisorPanelDeck
          title="Map panels"
          template={mapTemplate}
          surfaced={false}
          openTrunk={false}
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
            if (isToggleMapPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          onCollapseMainPanel={(panelId) => {
            if (panelId === 'template-values') {
              // Collapse should demote to the rail, not restore prior flow state.
              adaptiveActions.bumpMutationToken();
              adaptiveActions.closeTemporaryPanel();
              return;
            }
            if (isToggleMapPanelId(panelId)) adaptiveActions.toggleMapPanel(panelId);
          }}
          renderPanelBody={(panelId) => {
            if (panelId === 'threshold') {
              return <ThresholdForm inline onCreated={handleThresholdCreated} onClose={closeActiveMapPanel} />;
            }

            if (panelId === 'mine') {
              return <HudMyOrganisms onSelect={handleOrganismSelect} />;
            }

            if (panelId === 'templates') {
              return (
                <HudTemplates
                  onTemplateInstantiated={handleTemplateInstantiated}
                  onTemplateValuesRequested={handleTemplateValuesRequested}
                />
              );
            }

            if (panelId === 'template-values' && templateCustomization) {
              return (
                <HudTemplateValuesPanel
                  customization={templateCustomization}
                  onCancel={closeTemplateValues}
                  onTemplateInstantiated={handleTemplateInstantiated}
                />
              );
            }

            return (
              <div className="hud-panel-empty">
                <span className="hud-info-dim">Select a template first to edit template values.</span>
              </div>
            );
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
          preferredMainPanelId={null}
          onPromotePanel={(panelId) => {
            if (!isInteriorPanelId(panelId)) return;
            openInVisor(enteredOrganismId);
          }}
          onCollapseMainPanel={() => undefined}
          renderPanelBody={() => null}
        />
      )}
    </div>
  );
}
