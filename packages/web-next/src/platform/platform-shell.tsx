/**
 * Platform shell for web-next.
 *
 * Verifies web-next is wired to the live API and world map pointer,
 * then renders the plain map slice with the minimal closed HUD scaffold.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchWorldMap } from '../api/fetch-world-map.js';
import type { Altitude } from '../contracts/altitude.js';
import { SpaceStage } from '../space/space-stage.js';
import { VisorHud } from '../visor/hud/index.js';
import { parseVisorRoute, type VisorRoute, writeVisorRoute } from '../visor/visor-route.js';

interface LoadState {
  readonly worldMapId: string | null;
  readonly loading: boolean;
  readonly error: string | null;
}

function readVisorRouteFromWindow(): VisorRoute {
  if (typeof window === 'undefined') {
    return { mode: 'closed', appId: null, organismId: null };
  }

  return parseVisorRoute(new URLSearchParams(window.location.search));
}

export function PlatformShell() {
  const [visorRoute, setVisorRoute] = useState<VisorRoute>(() => readVisorRouteFromWindow());
  const [altitude, setAltitude] = useState<Altitude>('high');
  const [isInInterior, setIsInInterior] = useState(false);
  const [changeAltitudeHandler, setChangeAltitudeHandler] = useState<((direction: 'in' | 'out') => void) | null>(null);
  const [backHandler, setBackHandler] = useState<(() => void) | null>(null);
  const [state, setState] = useState<LoadState>({
    worldMapId: null,
    loading: true,
    error: null,
  });

  const handleAltitudeControlReady = useCallback((handler: ((direction: 'in' | 'out') => void) | null) => {
    setChangeAltitudeHandler(() => handler);
  }, []);

  const handleBackControlReady = useCallback((handler: (() => void) | null) => {
    setBackHandler(() => handler);
  }, []);

  const handleAltitudeChangeRequested = useCallback(
    (direction: 'in' | 'out') => {
      changeAltitudeHandler?.(direction);
    },
    [changeAltitudeHandler],
  );

  const handleBackRequested = useCallback(() => {
    backHandler?.();
  }, [backHandler]);

  const updateVisorRoute = useCallback((nextRoute: VisorRoute) => {
    if (typeof window === 'undefined') {
      setVisorRoute(nextRoute);
      return;
    }

    const nextParams = writeVisorRoute(new URLSearchParams(window.location.search), nextRoute);
    const nextQuery = nextParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery.length > 0 ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.pushState({}, '', nextUrl);
    setVisorRoute(nextRoute);
  }, []);

  const handleOpenApp = useCallback(
    (appId: string) => {
      updateVisorRoute({
        mode: 'open',
        appId,
        organismId: null,
      });
    },
    [updateVisorRoute],
  );

  const handleCloseVisor = useCallback(() => {
    updateVisorRoute({
      mode: 'closed',
      appId: null,
      organismId: null,
    });
  }, [updateVisorRoute]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onPopState = () => {
      setVisorRoute(readVisorRouteFromWindow());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
      <SpaceStage
        worldMapId={state.worldMapId}
        onAltitudeChange={setAltitude}
        onAltitudeControlReady={handleAltitudeControlReady}
        onBackControlReady={handleBackControlReady}
        onInteriorChange={setIsInInterior}
      />
      <VisorHud
        mode={visorRoute.mode}
        appId={visorRoute.appId}
        altitude={altitude}
        showAltitudeControls={!isInInterior}
        showCompass={!isInInterior}
        navigationLabel={isInInterior ? 'Organism interior' : null}
        onChangeAltitude={handleAltitudeChangeRequested}
        onGoBack={handleBackRequested}
        canGoBack={Boolean(backHandler)}
        onOpenApp={handleOpenApp}
        onCloseVisor={handleCloseVisor}
      />
    </div>
  );
}
