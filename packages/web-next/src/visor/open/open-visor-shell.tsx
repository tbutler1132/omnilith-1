/**
 * Open visor shell.
 *
 * Phone-mode visor layout with a floating shell header spanning both
 * columns, then a thin app rail on the left and active app content on
 * the right. The app rail can collapse into a compact quick-switch mode.
 */

import { useState } from 'react';
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
  const [railCollapsed, setRailCollapsed] = useState(false);
  const apps = listVisorApps();
  const activeApp = resolveVisorApp(appId);
  const ActiveAppComponent = activeApp.component;
  const railToggleLabel = railCollapsed ? 'Expand app rail' : 'Collapse app rail';

  return (
    <section className="open-visor-shell" data-phase={phase} aria-label="Open visor">
      <OpenVisorHeader
        appLabel={activeApp.label}
        appDescription={activeApp.description}
        onRequestClose={onRequestClose}
      />

      <div className="open-visor-body" data-rail-collapsed={railCollapsed ? 'true' : 'false'}>
        <aside
          className={`open-visor-rail ${railCollapsed ? 'open-visor-rail--collapsed' : ''}`}
          aria-label="Visor apps"
        >
          <button
            type="button"
            className="open-visor-rail-toggle"
            onClick={() => setRailCollapsed((current) => !current)}
            aria-expanded={!railCollapsed}
            aria-label={railToggleLabel}
            title={railToggleLabel}
          >
            {railCollapsed ? '»' : '«'}
          </button>

          <div className="open-visor-app-list">
            {apps.map((app) => (
              <button
                key={app.id}
                type="button"
                className={`open-visor-app-button ${app.id === activeApp.id ? 'open-visor-app-button--active' : ''}`}
                onClick={() => onOpenApp(app.id)}
                aria-label={`${app.label} app`}
                title={railCollapsed ? app.label : undefined}
              >
                {railCollapsed ? compactAppLabel(app.label) : app.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="open-visor-app-pane">
          <ActiveAppComponent onRequestClose={onRequestClose} organismId={organismId} />
        </div>
      </div>
    </section>
  );
}

function compactAppLabel(label: string): string {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}
