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
  readonly onGoBack: () => void;
  readonly canGoBack: boolean;
}

export function SpatialControlsSlot({ altitude, onChangeAltitude, onGoBack, canGoBack }: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
      <SpatialNavWidget altitude={altitude} onGoBack={onGoBack} canGoBack={canGoBack} />
      <AltitudeControlsWidget altitude={altitude} onChangeAltitude={onChangeAltitude} />
    </div>
  );
}
