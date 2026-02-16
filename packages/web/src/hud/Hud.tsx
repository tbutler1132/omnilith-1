/**
 * Hud — the Visor's rendering layer.
 *
 * The Visor is always on. Its HUD mode is the persistent layer: bar,
 * location, altitude, compass, logout. Legacy mode uses a pill toggle
 * to expand into context-sensitive active mode:
 *
 * - On the map: action buttons (Threshold, My Organisms, Tend)
 * - Inside an organism: a Tend button to open the full tending view
 * - Tending an organism: the VisorView (renderer + sidebar)
 *
 * VisorView takes priority whenever visorOrganismId is set —
 * it works regardless of spatial position (map or interior).
 */

import { useEffect } from 'react';
import { useOrganism } from '../hooks/use-organism.js';
import { selectActiveMapPanel } from '../platform/adaptive-visor-compositor.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformMapState,
  usePlatformVisorState,
} from '../platform/index.js';
import { AdaptiveVisorHost } from './AdaptiveVisorHost.js';
import { Compass } from './Compass.js';
import { HudCueLayer } from './cues/HudCueLayer.js';
import { HudBar } from './HudBar.js';
import { HudMapActions } from './HudMapActions.js';
import { VisorView } from './VisorView.js';

interface HudProps {
  onLogout: () => void;
}

/** Bottom-left action when inside an organism — opens it in the Visor */
function HudInteriorActions({ organismId }: { organismId: string }) {
  const { openInVisor } = usePlatformActions();
  const { data } = useOrganism(organismId);
  const name = data?.organism.name ?? '...';

  return (
    <div className="hud-map-actions-container">
      <div className="hud-map-actions">
        <button type="button" className="hud-map-btn hud-map-btn--tend" onClick={() => openInVisor(organismId)}>
          Tend {name}
        </button>
      </div>
    </div>
  );
}

export function Hud({ onLogout }: HudProps) {
  const { enteredOrganismId } = usePlatformMapState();
  const { visorOpen, visorOrganismId } = usePlatformVisorState();
  const { closeVisor, openVisor, toggleVisor, closeVisorOrganism } = usePlatformActions();
  const adaptiveVisorState = usePlatformAdaptiveVisorState();
  const adaptiveVisorActions = usePlatformAdaptiveVisorActions();
  const isInside = enteredOrganismId !== null;
  const adaptiveEnabled = adaptiveVisorState.adaptiveEnabled;
  const expanded = adaptiveEnabled ? true : visorOpen;
  const activeMapPanel = selectActiveMapPanel(adaptiveVisorState);

  useEffect(() => {
    if (!adaptiveEnabled || visorOpen) return;
    openVisor();
  }, [adaptiveEnabled, visorOpen, openVisor]);

  // V key toggles expanded mode, Escape dismisses organism then collapses
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'v' || e.key === 'V') {
        if (adaptiveEnabled) return;
        e.preventDefault();
        toggleVisor();
      } else if (e.key === 'Escape' && expanded) {
        e.preventDefault();
        if (visorOrganismId) {
          closeVisorOrganism();
        } else if (adaptiveEnabled && activeMapPanel) {
          if (activeMapPanel === 'template-values') {
            adaptiveVisorActions.closeTemporaryPanel();
          } else {
            adaptiveVisorActions.toggleMapPanel(activeMapPanel);
          }
        } else if (!adaptiveEnabled) {
          closeVisor();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    expanded,
    adaptiveEnabled,
    activeMapPanel,
    visorOrganismId,
    toggleVisor,
    closeVisor,
    closeVisorOrganism,
    adaptiveVisorActions,
  ]);

  return (
    <div
      className="hud"
      data-visor-policy={adaptiveEnabled ? 'adaptive' : 'legacy'}
      data-visor-map-panel={adaptiveEnabled ? (activeMapPanel ?? 'none') : 'legacy'}
    >
      <HudBar />
      <Compass />

      {/* Floating logout — top-right, always visible */}
      <button type="button" className="hud-logout" onClick={onLogout}>
        Log out
      </button>

      <div
        className={`hud-policy-badge ${adaptiveEnabled ? 'hud-policy-badge--adaptive' : 'hud-policy-badge--legacy'}`}
        data-cue-anchor="adaptive-policy-badge"
      >
        {adaptiveEnabled ? 'Adaptive HUD' : 'Legacy HUD'}
      </div>

      {!adaptiveEnabled && (
        <button
          type="button"
          className={`hud-pill ${expanded ? 'hud-pill--active' : ''}`}
          onClick={toggleVisor}
          data-cue-anchor="visor-pill"
        >
          {expanded ? '\u25B3' : '\u25BD'}
        </button>
      )}

      <HudCueLayer adaptiveEnabled={adaptiveEnabled} />

      {adaptiveEnabled ? (
        <div className={`hud-fade ${expanded ? 'hud-fade--visible' : ''}`}>{expanded && <AdaptiveVisorHost />}</div>
      ) : (
        <>
          {/* Expanded: organism tending view (any context) */}
          <div className={`hud-fade ${expanded && visorOrganismId ? 'hud-fade--visible' : ''}`}>
            {visorOrganismId && <VisorView organismId={visorOrganismId} />}
          </div>

          {/* Expanded on map: action buttons */}
          <div className={`hud-fade ${!isInside && expanded && !visorOrganismId ? 'hud-fade--visible' : ''}`}>
            <HudMapActions />
          </div>

          {/* Expanded inside organism: tend button */}
          <div className={`hud-fade ${isInside && expanded && !visorOrganismId ? 'hud-fade--visible' : ''}`}>
            {enteredOrganismId && <HudInteriorActions organismId={enteredOrganismId} />}
          </div>
        </>
      )}
    </div>
  );
}
