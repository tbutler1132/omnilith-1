/**
 * Visor HUD root for web-next.
 *
 * Provides the persistent HUD overlay layer and composes widget lanes
 * for both closed HUD mode and open visor app mode.
 */

import type { Altitude } from '../../contracts/altitude.js';
import { OpenVisorShell } from '../open/index.js';
import type { VisorMode } from '../visor-route.js';
import { AppDockSlot, SpatialControlsSlot } from './slots/index.js';
import { VisorWidgetLane } from './widget-lane.js';
import { CompassWidget } from './widgets/index.js';

interface VisorHudProps {
  readonly mode: VisorMode;
  readonly appId: string | null;
  readonly altitude: Altitude;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
  readonly onOpenApp: (appId: string) => void;
  readonly onCloseVisor: () => void;
}

export function VisorHud({ mode, appId, altitude, onChangeAltitude, onOpenApp, onCloseVisor }: VisorHudProps) {
  if (mode === 'open') {
    return (
      <div className="visor-hud-layer">
        <OpenVisorShell appId={appId} onOpenApp={onOpenApp} onRequestClose={onCloseVisor} />
      </div>
    );
  }

  return (
    <div className="visor-hud-layer">
      <SpatialControlsSlot altitude={altitude} onChangeAltitude={onChangeAltitude} />
      <AppDockSlot onOpenApp={onOpenApp} />
      <VisorWidgetLane>
        <CompassWidget />
      </VisorWidgetLane>
    </div>
  );
}
