/**
 * App dock slot.
 *
 * Reserves the bottom-left HUD lane for persistent app launch controls in
 * closed visor mode. Starts with a single Profile placeholder button.
 */

export function AppDockSlot() {
  return (
    <nav className="app-dock-slot" aria-label="Visor app dock">
      <div className="app-dock-shell">
        <button type="button" className="app-dock-button" aria-label="Profile app (placeholder)" disabled>
          Profile
        </button>
      </div>
    </nav>
  );
}
