/**
 * HudBar — persistent floating location indicator.
 *
 * Always visible. Context-aware: shows visor organism name when one is
 * loaded, altitude when on the map, or interior name when inside an
 * organism. Back button cascades through visor organism, interior,
 * focus, and map stack.
 */

import { useOrganism } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';

const ALTITUDE_LABELS: Record<string, string> = {
  high: 'High',
  mid: 'Mid',
  close: 'Close',
};

export function HudBar() {
  const { state, focusOrganism, exitOrganism, exitMap, closeVisorOrganism } = usePlatform();
  const isInside = state.enteredOrganismId !== null;
  const visorOrganismId = state.visorOrganismId;

  const showBack =
    visorOrganismId !== null || isInside || state.focusedOrganismId !== null || state.navigationStack.length > 1;

  function handleBack() {
    if (visorOrganismId) {
      closeVisorOrganism();
    } else if (isInside) {
      exitOrganism();
    } else if (state.focusedOrganismId) {
      focusOrganism(null);
    } else if (state.navigationStack.length > 1) {
      exitMap();
    }
  }

  return (
    <div className="hud-bar">
      <div className="hud-bar-left">
        {showBack && (
          <button type="button" className="hud-back" onClick={handleBack} aria-label="Back">
            &larr;
          </button>
        )}
        {visorOrganismId ? (
          <VisorLocation organismId={visorOrganismId} />
        ) : isInside && state.enteredOrganismId ? (
          <InteriorLocation organismId={state.enteredOrganismId} />
        ) : (
          <span className="hud-location">{ALTITUDE_LABELS[state.altitude] ?? 'High'}</span>
        )}
      </div>
    </div>
  );
}

/** Displays "Visor · [organism name]" */
function VisorLocation({ organismId }: { organismId: string }) {
  const { data } = useOrganism(organismId);
  const name = data?.organism.name ?? '...';

  return (
    <span className="hud-location">
      Visor &middot; <span className="hud-location-name">{name}</span>
    </span>
  );
}

/** Fetches organism name and displays "Inside [name]" */
function InteriorLocation({ organismId }: { organismId: string }) {
  const { data } = useOrganism(organismId);
  const name = data?.organism.name ?? '...';

  return (
    <span className="hud-location">
      Inside <span className="hud-location-name">{name}</span>
    </span>
  );
}
