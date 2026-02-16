/**
 * HudBar — persistent floating location indicator.
 *
 * Always visible. Context-aware: shows visor organism name when one is
 * loaded, altitude when on the map, or interior name when inside an
 * organism. Back button cascades through visor organism, interior,
 * focus, and map stack.
 */

import { useOrganism } from '../hooks/use-organism.js';
import {
  usePlatformActions,
  usePlatformMapState,
  usePlatformViewportMeta,
  usePlatformVisorState,
} from '../platform/index.js';

const ALTITUDE_LABELS: Record<string, string> = {
  high: 'High',
  mid: 'Mid',
  close: 'Close',
};

const ALTIMETER_LEVEL: Record<string, 0 | 1 | 2> = {
  high: 0,
  mid: 1,
  close: 2,
};

export function HudBar() {
  const { navigationStack, focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOrganismId } = usePlatformVisorState();
  const { altitude } = usePlatformViewportMeta();
  const { focusOrganism, exitOrganism, exitMap, closeVisorOrganism } = usePlatformActions();
  const isInside = enteredOrganismId !== null;

  const showBack = visorOrganismId !== null || isInside || focusedOrganismId !== null || navigationStack.length > 1;

  function handleBack() {
    if (visorOrganismId) {
      closeVisorOrganism();
    } else if (isInside) {
      exitOrganism();
    } else if (focusedOrganismId) {
      focusOrganism(null);
    } else if (navigationStack.length > 1) {
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
        ) : isInside && enteredOrganismId ? (
          <InteriorLocation organismId={enteredOrganismId} />
        ) : (
          <div className="hud-altitude">
            <span className="hud-location hud-altitude-label">{ALTITUDE_LABELS[altitude] ?? 'High'}</span>
            <span className="hud-altimeter" aria-hidden>
              <span
                className={`hud-altimeter-step ${ALTIMETER_LEVEL[altitude] >= 0 ? 'hud-altimeter-step--active' : ''}`}
              />
              <span
                className={`hud-altimeter-step ${ALTIMETER_LEVEL[altitude] >= 1 ? 'hud-altimeter-step--active' : ''}`}
              />
              <span
                className={`hud-altimeter-step ${ALTIMETER_LEVEL[altitude] >= 2 ? 'hud-altimeter-step--active' : ''}`}
              />
            </span>
          </div>
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
