/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for map navigation and altitude controls.
 * This slice mirrors the old map widget shapes with placeholder-only state.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import { AltitudeControlsWidget } from './altitude-controls-widget.js';
import { SpatialNavWidget } from './spatial-nav-widget.js';

interface SpatialControlsSlotProps {
  readonly altitude: Altitude;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
}

export function SpatialControlsSlot({ altitude, onChangeAltitude }: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
      <SpatialNavWidget altitude={altitude} />
      <AltitudeControlsWidget altitude={altitude} onChangeAltitude={onChangeAltitude} />
    </div>
  );
}
