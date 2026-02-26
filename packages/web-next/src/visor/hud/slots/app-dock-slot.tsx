/**
 * App dock slot.
 *
 * Reserves the bottom-left HUD lane for persistent core app launch controls
 * in closed visor mode. Extra apps remain available in the open visor rail.
 */

import { listCoreVisorApps } from '../../apps/index.js';

interface AppDockSlotProps {
  readonly onOpenApp: (appId: string) => void;
}

export function AppDockSlot({ onOpenApp }: AppDockSlotProps) {
  const apps = listCoreVisorApps();

  return (
    <nav className="app-dock-slot" aria-label="Visor app dock">
      <div className="app-dock-shell">
        {apps.map((app) => {
          const AppIcon = app.icon;

          return (
            <button
              key={app.id}
              type="button"
              className="app-dock-button"
              onClick={() => onOpenApp(app.id)}
              aria-label={`Open ${app.label} app`}
              title={app.label}
            >
              <AppIcon className="app-dock-icon" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
