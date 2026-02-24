/**
 * Open visor shell.
 *
 * Phone-mode visor layout with a floating shell header spanning both
 * columns, then a thin app rail on the left and active app content on
 * the right.
 */

import { listVisorApps, resolveVisorApp } from '../apps/index.js';
import { OpenVisorHeader } from './open-visor-header.js';

interface OpenVisorShellProps {
  readonly appId: string | null;
  readonly organismId: string | null;
  readonly phase: 'opening' | 'open' | 'closing';
  readonly onOpenApp: (appId: string) => void;
  readonly onRequestClose: () => void;
}

export function OpenVisorShell({ appId, organismId, phase, onOpenApp, onRequestClose }: OpenVisorShellProps) {
  const apps = listVisorApps();
  const activeApp = resolveVisorApp(appId);
  const ActiveAppComponent = activeApp.component;

  return (
    <section className="open-visor-shell" data-phase={phase} aria-label="Open visor">
      <OpenVisorHeader
        appLabel={activeApp.label}
        appDescription={activeApp.description}
        onRequestClose={onRequestClose}
      />

      <div className="open-visor-body">
        <aside className="open-visor-rail" aria-label="Visor apps">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              className={`open-visor-app-button ${app.id === activeApp.id ? 'open-visor-app-button--active' : ''}`}
              onClick={() => onOpenApp(app.id)}
              aria-label={`${app.label} app`}
            >
              {app.label}
            </button>
          ))}
        </aside>

        <div className="open-visor-app-pane">
          <ActiveAppComponent onRequestClose={onRequestClose} organismId={organismId} />
        </div>
      </div>
    </section>
  );
}
