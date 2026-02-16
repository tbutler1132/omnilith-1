/**
 * Compass — spatial orientation widget.
 *
 * Rendered in the adaptive widget lane for map context.
 */

export function Compass() {
  return (
    <div className="compass">
      <svg width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="Compass pointing north">
        <polygon points="16,4 12,20 16,16 20,20" fill="currentColor" opacity="0.8" />
      </svg>
      <span className="compass-label">N</span>
    </div>
  );
}
