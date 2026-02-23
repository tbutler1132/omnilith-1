/**
 * Platform shell for web-next.
 *
 * Verifies web-next is wired to the live API and world map pointer,
 * then renders the plain map slice with the minimal closed HUD scaffold.
 */

import { useEffect, useState } from 'react';
import { fetchWorldMap } from '../api/fetch-world-map.js';
import { SpaceStage } from '../space/space-stage.js';
import { VisorHud } from '../visor/hud/index.js';

interface LoadState {
  readonly worldMapId: string | null;
  readonly loading: boolean;
  readonly error: string | null;
}

export function PlatformShell() {
  const [state, setState] = useState<LoadState>({
    worldMapId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchWorldMap()
      .then((response) => {
        if (!response.worldMapId) {
          throw new Error('World map pointer is not available from API');
        }

        setState({
          worldMapId: response.worldMapId,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load world map pointer';
        setState({
          worldMapId: null,
          loading: false,
          error: message,
        });
      });
  }, []);

  if (state.loading) {
    return (
      <div className="platform-shell platform-shell-status" data-status="loading">
        <p>Loading Space...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="platform-shell platform-shell-status" data-status="error">
        <p>{state.error}</p>
      </div>
    );
  }

  if (!state.worldMapId) {
    return (
      <div className="platform-shell platform-shell-status" data-status="error">
        <p>World map pointer is missing.</p>
      </div>
    );
  }

  return (
    <div className="platform-shell" data-status="ready">
      <SpaceStage worldMapId={state.worldMapId} />
      <VisorHud />
    </div>
  );
}
