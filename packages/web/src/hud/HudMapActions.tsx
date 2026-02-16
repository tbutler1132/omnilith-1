/**
 * HudMapActions — legacy visor-up action buttons when on the map.
 *
 * Adaptive mode now uses AdaptiveVisorHost.
 */

import { useMemo, useState } from 'react';
import { useOrganism } from '../hooks/use-organism.js';
import { ThresholdForm } from '../organisms/ThresholdForm.js';
import { usePlatformActions, usePlatformMapState } from '../platform/index.js';
import { HudMyOrganisms } from './HudMyOrganisms.js';
import { HudTemplates } from './HudTemplates.js';
import { HudTemplateValuesPanel } from './HudTemplateValuesPanel.js';
import type { TemplateSongCustomization } from './template-values.js';

type ActivePanel = 'threshold' | 'mine' | 'templates' | 'template-values' | null;
type TogglePanelId = 'threshold' | 'mine' | 'templates';

/** Shows focused organism name + "Tend" action */
function FocusedOrganismButton({ organismId, onTend }: { organismId: string; onTend: () => void }) {
  const { data } = useOrganism(organismId);
  const name = data?.organism.name ?? '...';

  return (
    <button type="button" className="hud-map-btn hud-map-btn--tend" onClick={onTend}>
      Tend {name}
    </button>
  );
}

export function HudMapActions() {
  const { focusedOrganismId } = usePlatformMapState();
  const { openInVisor } = usePlatformActions();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [templateCustomization, setTemplateCustomization] = useState<TemplateSongCustomization | null>(null);

  function togglePanel(panel: TogglePanelId) {
    setActivePanel((cur) => (cur === panel ? null : panel));
  }

  function closeActivePanel() {
    if (!activePanel) return;
    if (activePanel === 'template-values') {
      setActivePanel('templates');
      return;
    }
    togglePanel(activePanel);
  }

  function handleThresholdCreated(organismId: string) {
    closeActivePanel();
    openInVisor(organismId);
  }

  function handleOrganismSelect(organismId: string) {
    closeActivePanel();
    openInVisor(organismId);
  }

  function handleTemplateInstantiated(organismId: string) {
    setTemplateCustomization(null);
    closeActivePanel();
    openInVisor(organismId);
  }

  function handleTemplateValuesRequested(customization: TemplateSongCustomization) {
    setTemplateCustomization(customization);
    setActivePanel('template-values');
  }

  function closeTemplateValues() {
    setTemplateCustomization(null);
    setActivePanel('templates');
  }

  const panelHint = useMemo(() => {
    if (activePanel === 'threshold') return 'Define identity, choose state type, and threshold in one flow.';
    if (activePanel === 'mine') return 'Jump directly into tending organisms you already steward.';
    if (activePanel === 'templates') return 'Instantiate a recipe to create a composed organism bundle.';
    if (activePanel === 'template-values') return 'Set initial values, then threshold the composed bundle.';
    if (focusedOrganismId) return 'Focused organism is ready to tend.';
    return 'Threshold a new organism or open one you already steward.';
  }, [activePanel, focusedOrganismId]);

  return (
    <div className="hud-map-actions-container">
      {activePanel === 'threshold' && (
        <div className="hud-panel hud-panel--threshold hud-fade hud-fade--visible">
          <div className="hud-panel-inner">
            <ThresholdForm inline onCreated={handleThresholdCreated} onClose={closeActivePanel} />
          </div>
        </div>
      )}

      {activePanel === 'mine' && (
        <div className="hud-panel hud-panel--mine hud-fade hud-fade--visible">
          <div className="hud-panel-inner">
            <HudMyOrganisms onSelect={handleOrganismSelect} />
          </div>
        </div>
      )}

      {activePanel === 'templates' && (
        <div className="hud-panel hud-panel--templates hud-fade hud-fade--visible">
          <div className="hud-panel-inner">
            <HudTemplates
              onTemplateInstantiated={handleTemplateInstantiated}
              onTemplateValuesRequested={handleTemplateValuesRequested}
            />
          </div>
        </div>
      )}

      {activePanel === 'template-values' && templateCustomization && (
        <div className="hud-panel hud-panel--template-values hud-fade hud-fade--visible">
          <div className="hud-panel-inner">
            <HudTemplateValuesPanel
              customization={templateCustomization}
              onCancel={closeTemplateValues}
              onTemplateInstantiated={handleTemplateInstantiated}
            />
          </div>
        </div>
      )}

      <div className="hud-map-actions">
        {focusedOrganismId && (
          <FocusedOrganismButton
            organismId={focusedOrganismId}
            onTend={() => {
              if (focusedOrganismId) openInVisor(focusedOrganismId);
            }}
          />
        )}
        <button
          type="button"
          className={`hud-map-btn ${activePanel === 'threshold' ? 'hud-map-btn--active' : ''}`}
          onClick={() => togglePanel('threshold')}
        >
          Threshold New
        </button>
        <button
          type="button"
          className={`hud-map-btn ${activePanel === 'mine' ? 'hud-map-btn--active' : ''}`}
          onClick={() => togglePanel('mine')}
        >
          My Organisms
        </button>
        <button
          type="button"
          className={`hud-map-btn ${activePanel === 'templates' ? 'hud-map-btn--active' : ''}`}
          onClick={() => togglePanel('templates')}
        >
          Templates
        </button>
      </div>

      <p className="hud-map-actions-hint">{panelHint}</p>
    </div>
  );
}
