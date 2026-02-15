/**
 * HudBar — persistent floating location indicator.
 *
 * Always visible. Context-aware: on the map it shows altitude;
 * inside an organism it shows the organism name and back button.
 * No background — elements float directly over the space.
 */

import { useOrganism } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';
import { getPreviewText } from '../utils/preview-text.js';

const ALTITUDE_LABELS: Record<string, string> = {
  high: 'High',
  mid: 'Mid',
  close: 'Close',
};

export function HudBar() {
  const { state, focusOrganism, exitOrganism } = usePlatform();
  const isInside = state.enteredOrganismId !== null;

  const showBack = isInside || state.focusedOrganismId !== null || state.navigationStack.length > 1;

  function handleBack() {
    if (isInside) {
      exitOrganism();
    } else if (state.focusedOrganismId) {
      focusOrganism(null);
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
        {isInside && state.enteredOrganismId ? (
          <InteriorLocation organismId={state.enteredOrganismId} />
        ) : (
          <span className="hud-location">{ALTITUDE_LABELS[state.altitude] ?? 'High'}</span>
        )}
      </div>
    </div>
  );
}

/** Fetches organism name and displays "Inside [name]" */
function InteriorLocation({ organismId }: { organismId: string }) {
  const { data } = useOrganism(organismId);
  const name = data?.currentState ? getPreviewText(data.currentState, 40) : '...';

  return (
    <span className="hud-location">
      Inside <span className="hud-location-name">{name}</span>
    </span>
  );
}
