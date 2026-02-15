/**
 * Hud — context-aware crossfade overlay.
 *
 * Replaces the modal visor with a fixed overlay whose elements fade
 * in and out based on where you are (map vs interior) and whether
 * the visor is up or down. Nothing slides. Nothing opens or closes.
 * The world stays put. Information becomes more or less visible.
 */

import { useEffect } from 'react';
import { usePlatform } from '../platform/index.js';
import { HudBar } from './HudBar.js';
import { HudInteriorInfo } from './HudInteriorInfo.js';
import { HudMapActions } from './HudMapActions.js';

interface HudProps {
  onLogout: () => void;
}

export function Hud({ onLogout }: HudProps) {
  const { state, closeVisor, toggleVisor } = usePlatform();
  const isInside = state.enteredOrganismId !== null;
  const visorUp = state.visorOpen;

  // V key toggles visor, Escape closes it when up
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        toggleVisor();
      } else if (e.key === 'Escape' && visorUp) {
        e.preventDefault();
        closeVisor();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visorUp, toggleVisor, closeVisor]);

  return (
    <div className="hud">
      <HudBar />

      {/* Floating logout — top-right, always visible */}
      <button type="button" className="hud-logout" onClick={onLogout}>
        Log out
      </button>

      {/* Visor toggle pill — bottom-center, always visible */}
      <button type="button" className={`hud-pill ${visorUp ? 'hud-pill--active' : ''}`} onClick={toggleVisor}>
        {visorUp ? '\u25B3 Close' : '\u25BD Visor'}
      </button>

      {/* Map, visor up: action buttons at bottom-left */}
      <div className={`hud-fade ${!isInside && visorUp ? 'hud-fade--visible' : ''}`}>
        <HudMapActions />
      </div>

      {/* Interior, visor up: universal layer summary on right */}
      <div className={`hud-fade ${isInside && visorUp ? 'hud-fade--visible' : ''}`}>
        {state.enteredOrganismId && <HudInteriorInfo organismId={state.enteredOrganismId} />}
      </div>
    </div>
  );
}
