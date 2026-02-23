/**
 * Compass widget.
 *
 * Gives lightweight orientation in the HUD lane while map interactions
 * remain minimal and drag-focused.
 */

export function CompassWidget() {
  return (
    <div className="visor-widget compass-widget">
      <svg width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="Compass pointing north">
        <polygon points="16,4 12,20 16,16 20,20" fill="currentColor" opacity="0.85" />
      </svg>
      <span className="compass-widget-label">N</span>
    </div>
  );
}
