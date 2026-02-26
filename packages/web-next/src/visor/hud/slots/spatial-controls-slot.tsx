/**
 * Spatial controls slot.
 *
 * Reserves the top-left HUD slot for one-level spatial boundary navigation.
 */
import { SpatialNavWidget } from './spatial-nav-widget.js';

interface SpatialControlsSlotProps {
  readonly currentLabel: string;
  readonly upTargetLabel: string | null;
  readonly onGoUp: () => void;
  readonly showUpControl: boolean;
  readonly canGoUp: boolean;
}

export function SpatialControlsSlot({
  currentLabel,
  upTargetLabel,
  onGoUp,
  showUpControl,
  canGoUp,
}: SpatialControlsSlotProps) {
  return (
    <div className="spatial-controls-slot">
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
