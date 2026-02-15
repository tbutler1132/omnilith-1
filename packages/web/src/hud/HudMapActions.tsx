/**
 * HudMapActions — visor-up action buttons when on the map.
 *
 * Positioned bottom-left. "Threshold" opens inline form,
 * "My Organisms" opens a compact list. Each floating panel
 * is a semi-transparent box that fades in above the buttons.
 */

import { useState } from 'react';
import { surfaceOnWorldMap } from '../api/surface.js';
import { ThresholdForm } from '../organisms/ThresholdForm.js';
import { usePlatform } from '../platform/index.js';
import { HudMyOrganisms } from './HudMyOrganisms.js';

type ActivePanel = 'threshold' | 'mine' | null;

export function HudMapActions() {
  const { state, focusOrganism, closeVisor, bumpMapRefresh } = usePlatform();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  function togglePanel(panel: 'threshold' | 'mine') {
    setActivePanel((cur) => (cur === panel ? null : panel));
  }

  async function handleThresholdCreated(organismId: string) {
    // Surface on the world map near where the user is looking
    const offset = () => (Math.random() - 0.5) * 200;
    const x = state.viewportCenter.x + offset();
    const y = state.viewportCenter.y + offset();

    try {
      await surfaceOnWorldMap(state.worldMapId, organismId, x, y);
    } catch {
      // Organism was still created — surfacing failure is non-fatal
    }

    bumpMapRefresh();
    focusOrganism(organismId);
    setActivePanel(null);
    closeVisor();
  }

  function handleOrganismSelect(organismId: string) {
    focusOrganism(organismId);
    setActivePanel(null);
    closeVisor();
  }

  return (
    <div className="hud-map-actions-container">
      {activePanel === 'threshold' && (
        <div className="hud-panel hud-fade hud-fade--visible">
          <div className="hud-panel-inner">
            <ThresholdForm inline onCreated={handleThresholdCreated} onClose={() => setActivePanel(null)} />
          </div>
        </div>
      )}

      {activePanel === 'mine' && (
        <div className="hud-panel hud-fade hud-fade--visible">
          <div className="hud-panel-inner">
            <HudMyOrganisms onSelect={handleOrganismSelect} />
          </div>
        </div>
      )}

      <div className="hud-map-actions">
        <button
          type="button"
          className={`hud-map-btn ${activePanel === 'threshold' ? 'hud-map-btn--active' : ''}`}
          onClick={() => togglePanel('threshold')}
        >
          Threshold
        </button>
        <button
          type="button"
          className={`hud-map-btn ${activePanel === 'mine' ? 'hud-map-btn--active' : ''}`}
          onClick={() => togglePanel('mine')}
        >
          My Organisms
        </button>
      </div>
    </div>
  );
}
