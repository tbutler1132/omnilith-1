/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for map navigation.
 * This slice anchors orientation while directional controls and telemetry
 * render in dedicated HUD lanes.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import { SpatialNavWidget } from './spatial-nav-widget.js';

interface SpatialControlsSlotProps {
  readonly altitude: Altitude;
  readonly navigationLabel?: string | null;
  readonly onGoBack: () => void;
  readonly canGoBack: boolean;
}

export function SpatialControlsSlot({ altitude, navigationLabel, onGoBack, canGoBack }: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
      <SpatialNavWidget altitude={altitude} contextLabel={navigationLabel} onGoBack={onGoBack} canGoBack={canGoBack} />
    </div>
  );
}
