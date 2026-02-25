/**
 * Spatial altitude slot.
 *
 * Reserves the bottom-right HUD lane for spatial control inputs that
 * change map altitude. This keeps navigation and movement controls
 * in separate slots so each lane can evolve independently.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import { AltitudeControlsWidget } from './altitude-controls-widget.js';

interface SpatialAltitudeSlotProps {
  readonly altitude: Altitude;
  readonly showAltitudeControls: boolean;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
}

export function SpatialAltitudeSlot({ altitude, showAltitudeControls, onChangeAltitude }: SpatialAltitudeSlotProps) {
  if (!showAltitudeControls) {
    return null;
  }

  return (
    <div className="spatial-altitude-slot">
      <AltitudeControlsWidget altitude={altitude} onChangeAltitude={onChangeAltitude} />
    </div>
  );
}
