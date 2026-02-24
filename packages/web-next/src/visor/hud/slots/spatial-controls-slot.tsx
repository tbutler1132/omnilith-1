/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for map navigation and altitude controls.
 * This slice mirrors the old map widget shapes with placeholder-only state.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import type { VisorAppSpatialContext } from '../../apps/spatial-context-contract.js';
import { AltitudeControlsWidget } from './altitude-controls-widget.js';
import { SpatialNavWidget } from './spatial-nav-widget.js';
import { SpatialReadoutWidget } from './spatial-readout-widget.js';

interface SpatialControlsSlotProps {
  readonly altitude: Altitude;
  readonly spatialContext: VisorAppSpatialContext;
  readonly showAltitudeControls: boolean;
  readonly navigationLabel?: string | null;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
  readonly onGoBack: () => void;
  readonly canGoBack: boolean;
}

export function SpatialControlsSlot({
  altitude,
  spatialContext,
  showAltitudeControls,
  navigationLabel,
  onChangeAltitude,
  onGoBack,
  canGoBack,
}: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
      <SpatialNavWidget altitude={altitude} contextLabel={navigationLabel} onGoBack={onGoBack} canGoBack={canGoBack} />
      {showAltitudeControls ? <AltitudeControlsWidget altitude={altitude} onChangeAltitude={onChangeAltitude} /> : null}
      {showAltitudeControls ? <SpatialReadoutWidget spatialContext={spatialContext} /> : null}
    </div>
  );
}
