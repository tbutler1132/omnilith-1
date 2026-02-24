/**
 * App dock slot.
 *
 * Reserves the bottom-left HUD lane for persistent app launch controls in
 * closed visor mode. Buttons mirror the open-visor app registry.
 */

import { listVisorApps } from '../../apps/index.js';

interface AppDockSlotProps {
  readonly onOpenApp: (appId: string) => void;
}

export function AppDockSlot({ onOpenApp }: AppDockSlotProps) {
  const apps = listVisorApps();

  return (
    <nav className="app-dock-slot" aria-label="Visor app dock">
      <div className="app-dock-shell">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            className="app-dock-button"
            onClick={() => onOpenApp(app.id)}
            aria-label={`Open ${app.label} app`}
          >
            {app.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
