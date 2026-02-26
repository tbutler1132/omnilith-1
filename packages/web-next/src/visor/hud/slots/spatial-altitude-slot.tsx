/**
 * Spatial altitude slot.
 *
 * Reserves the bottom-right HUD lane for spatial control inputs that
 * change map altitude. This keeps navigation and movement controls
 * in separate slots so each lane can evolve independently.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import { AltitudeControlsWidget } from './altitude-controls-widget.js';
import { CenterMapWidget } from './center-map-widget.js';
import { PanControlsWidget } from './pan-controls-widget.js';

type PanDirection = 'up' | 'down' | 'left' | 'right';

interface SpatialAltitudeSlotProps {
  readonly altitude: Altitude;
  readonly showAltitudeControls: boolean;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
  readonly onCenterMap: () => void;
  readonly onPanMap: (direction: PanDirection) => void;
}

export function SpatialAltitudeSlot({
  altitude,
  showAltitudeControls,
  onChangeAltitude,
  onCenterMap,
  onPanMap,
}: SpatialAltitudeSlotProps) {
  if (!showAltitudeControls) {
    return null;
  }

  return (
    <div className="spatial-altitude-slot">
      <div className="spatial-altitude-controls-group">
        <CenterMapWidget onCenterMap={onCenterMap} />
        <PanControlsWidget onPan={onPanMap} />
        <AltitudeControlsWidget altitude={altitude} onChangeAltitude={onChangeAltitude} />
      </div>
    </div>
  );
}
