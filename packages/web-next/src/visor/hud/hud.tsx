/**
 * Visor HUD root for web-next.
 *
 * Provides the persistent HUD overlay layer and composes widget lanes
 * without introducing open-Visor app mode concerns yet.
 */

import { SpatialControlsSlot } from './slots/index.js';
import { VisorWidgetLane } from './widget-lane.js';
import { CompassWidget } from './widgets/index.js';

export function VisorHud() {
  return (
    <div className="visor-hud-layer">
      <SpatialControlsSlot />
      <VisorWidgetLane>
        <CompassWidget />
      </VisorWidgetLane>
    </div>
  );
}
