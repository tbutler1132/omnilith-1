/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for one-level spatial boundary navigation.
 */
import type { VisorAppSpatialContext } from '../../apps/spatial-context-contract.js';
import { SpatialMiniMapWidget } from '../widgets/spatial-mini-map-widget.js';
import { SpatialNavWidget } from './spatial-nav-widget.js';

interface SpatialControlsSlotProps {
  readonly spatialContext: VisorAppSpatialContext;
  readonly currentLabel: string;
  readonly upTargetLabel: string | null;
  readonly onGoUp: () => void;
  readonly showUpControl: boolean;
  readonly canGoUp: boolean;
}

export function SpatialControlsSlot({
  spatialContext,
  currentLabel,
  upTargetLabel,
  onGoUp,
  showUpControl,
  canGoUp,
}: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
      <SpatialMiniMapWidget spatialContext={spatialContext} />
      <SpatialNavWidget
        currentLabel={currentLabel}
        upTargetLabel={upTargetLabel}
        onGoUp={onGoUp}
        showUpControl={showUpControl}
        canGoUp={canGoUp}
      />
    </div>
  );
}
