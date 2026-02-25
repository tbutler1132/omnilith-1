/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for map navigation and spatial readout.
 * This slice anchors orientation and telemetry while directional controls
 * stay in a dedicated spatial slot.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import type { VisorAppSpatialContext } from '../../apps/spatial-context-contract.js';
import { SpatialNavWidget } from './spatial-nav-widget.js';
import { SpatialReadoutWidget } from './spatial-readout-widget.js';

interface SpatialControlsSlotProps {
  readonly altitude: Altitude;
  readonly spatialContext: VisorAppSpatialContext;
  readonly showAltitudeControls: boolean;
  readonly navigationLabel?: string | null;
  readonly onGoBack: () => void;
  readonly canGoBack: boolean;
}

export function SpatialControlsSlot({
  altitude,
  spatialContext,
  showAltitudeControls,
  navigationLabel,
  onGoBack,
  canGoBack,
}: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
      <SpatialNavWidget altitude={altitude} contextLabel={navigationLabel} onGoBack={onGoBack} canGoBack={canGoBack} />
      {showAltitudeControls ? <SpatialReadoutWidget spatialContext={spatialContext} /> : null}
    </div>
  );
}
