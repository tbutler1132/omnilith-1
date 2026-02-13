/**
 * Visor — personal device interface for tending organisms.
 *
 * Two layers: AmbientHud (always visible top bar with breadcrumb, focus indicator,
 * visor toggle) and the full visor panel (overlay with 4-tab navigation).
 */

import { usePlatform, type VisorSection } from '../platform/index.js';
import { VisorCompose } from './VisorCompose.js';
import { VisorDiscover } from './VisorDiscover.js';
import { VisorHere } from './VisorHere.js';
import { VisorMine } from './VisorMine.js';

const SECTIONS: { id: VisorSection; label: string }[] = [
  { id: 'here', label: 'Here' },
  { id: 'mine', label: 'Mine' },
  { id: 'compose', label: 'Compose' },
  { id: 'discover', label: 'Discover' },
];

interface VisorProps {
  onLogout: () => void;
}

export function Visor({ onLogout }: VisorProps) {
  const { state, toggleVisor, closeVisor, setVisorSection, navigateToMap, openVisor } = usePlatform();

  return (
    <>
      <div className="ambient-hud">
        <nav className="ambient-hud-breadcrumb">
          {state.navigationStack.map((entry, i) => (
            <span key={entry.mapId}>
              {i > 0 && <span className="ambient-hud-separator"> / </span>}
              {i < state.navigationStack.length - 1 ? (
                <button type="button" className="ambient-hud-crumb" onClick={() => navigateToMap(entry.mapId)}>
                  {entry.label}
                </button>
              ) : (
                <span className="ambient-hud-crumb ambient-hud-crumb--current">{entry.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="ambient-hud-right">
          {state.focusedOrganismId && (
            <button type="button" className="ambient-hud-inspect" onClick={() => openVisor('here')}>
              Open in Visor
            </button>
          )}
          <button type="button" className="ambient-hud-toggle" onClick={toggleVisor}>
            {state.visorOpen ? 'Close' : 'Visor'}
          </button>
          <button type="button" className="ambient-hud-logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {state.visorOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss pattern
        <div
          className="visor-overlay"
          role="presentation"
          onClick={closeVisor}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeVisor();
          }}
        >
          <div
            className="visor-panel"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <nav className="visor-nav">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`visor-nav-tab ${state.visorSection === s.id ? 'visor-nav-tab--active' : ''}`}
                  onClick={() => setVisorSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
              <button type="button" className="visor-nav-close" onClick={closeVisor}>
                Close
              </button>
            </nav>

            <div className="visor-content">
              {state.visorSection === 'here' && <VisorHere />}
              {state.visorSection === 'mine' && <VisorMine />}
              {state.visorSection === 'compose' && <VisorCompose />}
              {state.visorSection === 'discover' && <VisorDiscover />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
