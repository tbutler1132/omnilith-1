/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for map navigation and altitude controls.
 * This slice mirrors the old map widget shapes with placeholder-only state.
 */

import { AltitudeControlsWidget } from './altitude-controls-widget.js';
import { SpatialNavWidget } from './spatial-nav-widget.js';

export function SpatialControlsSlot() {
  return (
    <div className="spatial-controls-slot">
      <SpatialNavWidget />
      <AltitudeControlsWidget />
    </div>
  );
}
