/**
 * Hud — the Visor's rendering layer.
 *
 * The visor is adaptive-only. Rendering always flows through the
 * adaptive host so map, interior, and organism contexts share one
 * policy-driven panel system.
 */

import { useEffect } from 'react';
import { selectActiveMapPanel } from '../platform/adaptive-visor-compositor.js';
import {
  usePlatformActions,
  usePlatformAdaptiveVisorActions,
  usePlatformAdaptiveVisorState,
  usePlatformVisorState,
} from '../platform/index.js';
import { AdaptiveVisorHost } from './AdaptiveVisorHost.js';
import { HudCueLayer } from './cues/HudCueLayer.js';

export function Hud() {
  const { visorOrganismId } = usePlatformVisorState();
  const { closeVisorOrganism } = usePlatformActions();
  const adaptiveVisorState = usePlatformAdaptiveVisorState();
  const adaptiveVisorActions = usePlatformAdaptiveVisorActions();
  const activeMapPanel = selectActiveMapPanel(adaptiveVisorState);

  // Escape dismisses the active adaptive panel/organism view.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key !== 'Escape') return;

      if (visorOrganismId) {
        e.preventDefault();
        closeVisorOrganism();
        return;
      }

      if (activeMapPanel) {
        e.preventDefault();
        adaptiveVisorActions.toggleMapPanel(activeMapPanel);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMapPanel, visorOrganismId, closeVisorOrganism, adaptiveVisorActions]);

  return (
    <div className="hud" data-visor-policy="adaptive" data-visor-map-panel={activeMapPanel ?? 'none'}>
      <HudCueLayer />

      <div className="hud-fade hud-fade--visible">
        <AdaptiveVisorHost />
      </div>
    </div>
  );
}
