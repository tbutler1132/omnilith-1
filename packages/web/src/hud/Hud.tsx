/**
 * Hud — the Visor's rendering layer.
 *
 * The Visor is always on. Its HUD mode is the persistent layer: bar,
 * location, altitude, compass, logout. The pill toggle expands the
 * Visor into its active mode, which is context-sensitive:
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
import { usePlatformActions, usePlatformMapState, usePlatformVisorState } from '../platform/index.js';
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
  const { closeVisor, toggleVisor, closeVisorOrganism } = usePlatformActions();
  const isInside = enteredOrganismId !== null;
  const expanded = visorOpen;

  // V key toggles expanded mode, Escape dismisses organism then collapses
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        toggleVisor();
      } else if (e.key === 'Escape' && expanded) {
        e.preventDefault();
        if (visorOrganismId) {
          closeVisorOrganism();
        } else {
          closeVisor();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, visorOrganismId, toggleVisor, closeVisor, closeVisorOrganism]);

  return (
    <div className="hud">
      <HudBar />

      {/* Floating logout — top-right, always visible */}
      <button type="button" className="hud-logout" onClick={onLogout}>
        Log out
      </button>

      {/* Visor expand/collapse toggle — bottom-center, always visible */}
      <button type="button" className={`hud-pill ${expanded ? 'hud-pill--active' : ''}`} onClick={toggleVisor}>
        {expanded ? '\u25B3' : '\u25BD'}
      </button>

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
    </div>
  );
}
