/**
 * Altitude controls widget placeholder.
 *
 * Mirrors the old map altitude control shape while all buttons stay
 * intentionally disabled in this non-functional HUD slice.
 */

export function AltitudeControlsWidget() {
  return (
    <div className="altitude-controls">
      <button type="button" className="altitude-btn" disabled aria-label="Zoom in (placeholder)">
        +
      </button>
      <div className="altitude-indicator">
        <span className="altitude-label">High</span>
        <div className="altitude-pips" aria-hidden>
          <span className="altitude-pip" />
          <span className="altitude-pip" />
          <span className="altitude-pip altitude-pip--active" />
        </div>
      </div>
      <button type="button" className="altitude-btn" disabled aria-label="Zoom out (placeholder)">
        &minus;
      </button>
    </div>
  );
}
