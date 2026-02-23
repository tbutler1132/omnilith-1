/**
 * Spatial nav widget placeholder.
 *
 * Reuses the old map nav shape so we can validate top-left HUD composition
 * before wiring real navigation behavior.
 */

import type { Altitude } from '../../../contracts/altitude.js';

const NAV_ALTITUDE_LABELS: Readonly<Record<Altitude, string>> = {
  high: 'Wide view',
  mid: 'Near view',
  close: 'Close view',
};

const NAV_ALTIMETER_LEVEL: Readonly<Record<Altitude, 0 | 1 | 2>> = {
  high: 0,
  mid: 1,
  close: 2,
};

interface SpatialNavWidgetProps {
  readonly altitude: Altitude;
}

export function SpatialNavWidget({ altitude }: SpatialNavWidgetProps) {
  const level = NAV_ALTIMETER_LEVEL[altitude];

  return (
    <nav className="space-nav-content" aria-label="Spatial navigation">
      <button type="button" className="space-nav-back-btn" disabled aria-label="Back (placeholder)">
        &larr;
      </button>
      <div className="space-nav-altitude">
        <span className="space-nav-label space-nav-altitude-label">{NAV_ALTITUDE_LABELS[altitude]}</span>
        <span className="space-nav-altimeter" aria-hidden>
          <span className={`space-nav-altimeter-step ${level >= 0 ? 'space-nav-altimeter-step--active' : ''}`} />
          <span className={`space-nav-altimeter-step ${level >= 1 ? 'space-nav-altimeter-step--active' : ''}`} />
          <span className={`space-nav-altimeter-step ${level >= 2 ? 'space-nav-altimeter-step--active' : ''}`} />
        </span>
      </div>
    </nav>
  );
}
