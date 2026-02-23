/**
 * Closed Visor HUD scaffold.
 *
 * Establishes the persistent control surface shape (navigation, altitude,
 * orientation, legend, and dock) before open Visor app mode is introduced.
 */

interface ClosedVisorHudProps {
  readonly worldMapId: string;
}

const DOCK_APP_IDS = ['map', 'organism', 'proposals'];

export function ClosedVisorHud({ worldMapId }: ClosedVisorHudProps) {
  return (
    <aside className="closed-visor-hud" aria-label="Closed Visor HUD">
      <div className="closed-visor-row">
        <section className="hud-widget" aria-label="Navigation">
          <h2>Navigation</h2>
          <p>Top-level movement controls migrate here in Slice 2.</p>
        </section>
        <section className="hud-widget" aria-label="Altitude controls">
          <h2>Altitude</h2>
          <div className="hud-button-row">
            <button type="button">Near</button>
            <button type="button">Mid</button>
            <button type="button">Far</button>
          </div>
        </section>
      </div>

      <div className="closed-visor-row">
        <section className="hud-widget" aria-label="Compass">
          <h2>Compass</h2>
          <p>N / E / S / W</p>
        </section>
        <section className="hud-widget" aria-label="Map legend">
          <h2>Map legend</h2>
          <p>Legend scaffold linked to world map {worldMapId}.</p>
        </section>
      </div>

      <nav className="hud-dock" aria-label="Visor apps dock">
        {DOCK_APP_IDS.map((appId) => (
          <button key={appId} type="button" aria-disabled="true" title="Opens in Slice 3">
            {appId}
          </button>
        ))}
      </nav>
    </aside>
  );
}
