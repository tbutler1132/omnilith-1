/**
 * Visor HUD root for web-next.
 *
 * Provides the persistent HUD overlay layer and composes widget lanes
 * without introducing open-Visor app mode concerns yet.
 */

import type { Altitude } from '../../contracts/altitude.js';
import { SpatialControlsSlot } from './slots/index.js';
import { VisorWidgetLane } from './widget-lane.js';
import { CompassWidget } from './widgets/index.js';

interface VisorHudProps {
  readonly altitude: Altitude;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
}

export function VisorHud({ altitude, onChangeAltitude }: VisorHudProps) {
  return (
    <div className="visor-hud-layer">
      <SpatialControlsSlot altitude={altitude} onChangeAltitude={onChangeAltitude} />
      <VisorWidgetLane>
        <CompassWidget />
      </VisorWidgetLane>
    </div>
  );
}
