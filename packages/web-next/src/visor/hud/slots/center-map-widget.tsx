/**
 * Center map widget.
 *
 * Provides a dedicated control that recenters the current map viewport
 * without changing the active altitude level.
 */

interface CenterMapWidgetProps {
  readonly onCenterMap: () => void;
}

export function CenterMapWidget({ onCenterMap }: CenterMapWidgetProps) {
  return (
    <button type="button" className="map-center-btn" onClick={onCenterMap} aria-label="Center map">
      <span aria-hidden>⌖</span>
    </button>
  );
}
