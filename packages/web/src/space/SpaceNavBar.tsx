/**
 * SpaceNavBar — persistent top navigation for spatial movement.
 *
 * Displays current location context and a physical back cascade across
 * interior presence, focused organism, and map stack.
 */

import { useOrganism } from '../hooks/use-organism.js';
import { usePlatformActions, usePlatformMapState, usePlatformViewportMeta } from '../platform/index.js';

const ALTITUDE_LABELS: Record<string, string> = {
  high: 'Wide view',
  mid: 'Near view',
  close: 'Close view',
};

const ALTIMETER_LEVEL: Record<string, 0 | 1 | 2> = {
  high: 0,
  mid: 1,
  close: 2,
};

export function SpaceNavBar() {
  const { navigationStack, focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { altitude } = usePlatformViewportMeta();
  const { focusOrganism, exitOrganism, exitMap } = usePlatformActions();
  const isInside = enteredOrganismId !== null;

  const showBack = isInside || focusedOrganismId !== null || navigationStack.length > 1;

  function handleBack() {
    if (isInside) {
      exitOrganism();
    } else if (focusedOrganismId) {
      focusOrganism(null);
    } else if (navigationStack.length > 1) {
      exitMap();
    }
  }

  return (
    <div className="space-nav-bar">
      <div className="space-nav-content">
        {showBack && (
          <button type="button" className="space-nav-back-btn" onClick={handleBack} aria-label="Back">
            &larr;
          </button>
        )}
        {isInside && enteredOrganismId ? (
          <InteriorLocation organismId={enteredOrganismId} />
        ) : (
          <div className="space-nav-altitude">
            <span className="space-nav-label space-nav-altitude-label">{ALTITUDE_LABELS[altitude] ?? 'High'}</span>
            <span className="space-nav-altimeter" aria-hidden>
              <span
                className={`space-nav-altimeter-step ${
                  ALTIMETER_LEVEL[altitude] >= 0 ? 'space-nav-altimeter-step--active' : ''
                }`}
              />
              <span
                className={`space-nav-altimeter-step ${
                  ALTIMETER_LEVEL[altitude] >= 1 ? 'space-nav-altimeter-step--active' : ''
                }`}
              />
              <span
                className={`space-nav-altimeter-step ${
                  ALTIMETER_LEVEL[altitude] >= 2 ? 'space-nav-altimeter-step--active' : ''
                }`}
              />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function InteriorLocation({ organismId }: { organismId: string }) {
  const { data } = useOrganism(organismId);
  const name = data?.organism.name ?? '...';

  return (
    <span className="space-nav-label space-nav-location">
      Inside: <span className="space-nav-location-name">{name}</span>
    </span>
  );
}
