/**
 * App dock slot.
 *
 * Reserves the bottom-left HUD lane for persistent app launch controls in
 * closed visor mode. Starts with a single Profile placeholder button.
 */

interface AppDockSlotProps {
  readonly onOpenApp: (appId: string) => void;
}

export function AppDockSlot({ onOpenApp }: AppDockSlotProps) {
  return (
    <nav className="app-dock-slot" aria-label="Visor app dock">
      <div className="app-dock-shell">
        <button
          type="button"
          className="app-dock-button"
          onClick={() => onOpenApp('profile')}
          aria-label="Open Profile app"
        >
          Profile
        </button>
      </div>
    </nav>
  );
}
