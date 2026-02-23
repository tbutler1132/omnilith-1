/**
 * Spatial nav widget placeholder.
 *
 * Reuses the old map nav shape so we can validate top-left HUD composition
 * before wiring real navigation behavior.
 */

export function SpatialNavWidget() {
  return (
    <nav className="space-nav-content" aria-label="Spatial navigation">
      <button type="button" className="space-nav-back-btn" disabled aria-label="Back (placeholder)">
        &larr;
      </button>
      <div className="space-nav-altitude">
        <span className="space-nav-label space-nav-altitude-label">Wide view</span>
        <span className="space-nav-altimeter" aria-hidden>
          <span className="space-nav-altimeter-step space-nav-altimeter-step--active" />
          <span className="space-nav-altimeter-step" />
          <span className="space-nav-altimeter-step" />
        </span>
      </div>
    </nav>
  );
}
