/**
 * Platform shell for web-next.
 *
 * Verifies web-next is wired to the live API and world map pointer,
 * then renders the plain map slice with the minimal closed HUD scaffold.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchSession, loginWithPassword, logoutSession } from '../api/auth.js';
import { fetchWorldMap } from '../api/fetch-world-map.js';
import { clearSessionId, readSessionId } from '../api/session.js';
import type { Altitude } from '../contracts/altitude.js';
import { SpaceStage, type SpaceStageSpatialSnapshot } from '../space/space-stage.js';
import {
  clearVisorAppRoutes,
  createEmptySpatialContext,
  resolveVisorApp,
  SPATIAL_CONTEXT_COORDINATE_SYSTEM_VERSION,
  type VisorAppOpenRequest,
  type VisorAppSpatialContext,
} from '../visor/apps/index.js';
import { VisorHud } from '../visor/hud/index.js';
import { parseVisorRoute, type VisorRoute, writeVisorRoute } from '../visor/visor-route.js';
import { resolveOpenAppTargetOrganismId } from './resolve-open-app-target-organism-id.js';
import {
  DEV_SHORTCUT_LOGIN_EMAIL,
  DEV_SHORTCUT_LOGIN_PASSWORD,
  isSecretLoginShortcut,
} from './secret-login-shortcut.js';

interface LoadState {
  readonly worldMapId: string | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const ARRIVAL_OVERLAY_MS = 1400;
const INITIAL_LOADING_MIN_MS = 900;

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
  const [enteredOrganismId, setEnteredOrganismId] = useState<string | null>(null);
  const [boundaryOrganismId, setBoundaryOrganismId] = useState<string | null>(null);
  const [changeAltitudeHandler, setChangeAltitudeHandler] = useState<((direction: 'in' | 'out') => void) | null>(null);
  const [backHandler, setBackHandler] = useState<(() => void) | null>(null);
  const [state, setState] = useState<LoadState>({
    worldMapId: null,
    loading: true,
    error: null,
  });
  const [personalOrganismId, setPersonalOrganismId] = useState<string | null | undefined>(undefined);
  const [arrivalPlayed, setArrivalPlayed] = useState(false);
  const [arrivalVisible, setArrivalVisible] = useState(false);
  const [spatialContext, setSpatialContext] = useState<VisorAppSpatialContext>(() => createEmptySpatialContext());
  const isAuthenticated = readSessionId() !== null;
  const activeApp = resolveVisorApp(visorRoute.appId);
  const appRouteState =
    typeof window !== 'undefined' && visorRoute.mode === 'open' && activeApp.routeCodec
      ? activeApp.routeCodec.parseRoute(new URLSearchParams(window.location.search))
      : null;

  const renderArrivalOverlay = (mode: 'loading' | 'arrival') => (
    <div
      className={`platform-arrival-overlay ${
        mode === 'loading' ? 'platform-arrival-overlay--loading' : 'platform-arrival-overlay--active'
      }`}
      aria-hidden="true"
    >
      <div className="platform-arrival-core">
        <span className="platform-arrival-ring" />
        <span className="platform-arrival-ring platform-arrival-ring--delayed" />
        <span className="platform-arrival-dot" />
      </div>
      <p className="platform-arrival-label">Arriving</p>
    </div>
  );

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

  const handleSpatialContextChange = useCallback((snapshot: SpaceStageSpatialSnapshot) => {
    setSpatialContext({
      mapOrganismId: snapshot.mapOrganismId,
      focusedOrganismId: snapshot.focusedOrganismId,
      cursorWorld: snapshot.cursorWorld,
      hoveredEntry: snapshot.hoveredEntry,
      focusedEntry: snapshot.focusedEntry,
      viewport: {
        x: snapshot.viewport.x,
        y: snapshot.viewport.y,
        z: null,
        zoom: snapshot.viewport.zoom,
        altitude: snapshot.viewport.altitude,
      },
      surfaceSelection: snapshot.surfaceSelection,
      boundaryPath: snapshot.boundaryPath,
      timestamp: new Date().toISOString(),
      coordinateSystemVersion: SPATIAL_CONTEXT_COORDINATE_SYSTEM_VERSION,
    });
  }, []);

  const commitVisorSearchParams = useCallback((nextParams: URLSearchParams) => {
    const nextRoute = parseVisorRoute(nextParams);

    if (typeof window === 'undefined') {
      setVisorRoute(nextRoute);
      return;
    }

    const nextQuery = nextParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery.length > 0 ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.pushState({}, '', nextUrl);
    setVisorRoute(nextRoute);
  }, []);

  const updateVisorRoute = useCallback(
    (nextRoute: VisorRoute) => {
      const searchParams =
        typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
      let nextParams = clearVisorAppRoutes(searchParams);
      nextParams = writeVisorRoute(nextParams, nextRoute);
      commitVisorSearchParams(nextParams);
    },
    [commitVisorSearchParams],
  );

  const handleChangeAppRouteState = useCallback(
    (nextState: unknown) => {
      if (typeof window === 'undefined') {
        return;
      }

      if (!activeApp.routeCodec) {
        return;
      }

      let nextParams = clearVisorAppRoutes(new URLSearchParams(window.location.search));
      nextParams = writeVisorRoute(nextParams, {
        mode: 'open',
        appId: activeApp.id,
        organismId: visorRoute.organismId,
      });

      nextParams = activeApp.routeCodec.writeRoute(nextParams, nextState);
      commitVisorSearchParams(nextParams);
    },
    [activeApp, commitVisorSearchParams, visorRoute.organismId],
  );

  const handleOpenAppRequest = useCallback(
    (request: VisorAppOpenRequest) => {
      const openApp = async () => {
        const appId = request.appId;
        let nextPersonalOrganismId = personalOrganismId ?? null;

        if (
          appId === 'cadence' &&
          request.organismId === undefined &&
          isAuthenticated &&
          personalOrganismId === undefined
        ) {
          try {
            const session = await fetchSession();
            nextPersonalOrganismId = session.personalOrganismId ?? null;
            setPersonalOrganismId(nextPersonalOrganismId);
          } catch {
            nextPersonalOrganismId = null;
            setPersonalOrganismId(null);
          }
        }

        const targetedOrganismId =
          request.organismId !== undefined
            ? request.organismId
            : resolveOpenAppTargetOrganismId({
                appId,
                enteredOrganismId,
                boundaryOrganismId,
                visorOrganismId: visorRoute.organismId,
                personalOrganismId: nextPersonalOrganismId,
              });

        let nextParams =
          typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);

        nextParams = clearVisorAppRoutes(nextParams);
        nextParams = writeVisorRoute(nextParams, {
          mode: 'open',
          appId,
          organismId: targetedOrganismId,
        });

        const targetApp = resolveVisorApp(appId);
        if (request.appRouteState !== undefined && targetApp.routeCodec) {
          nextParams = targetApp.routeCodec.writeRoute(nextParams, request.appRouteState);
        }

        commitVisorSearchParams(nextParams);
      };

      void openApp();
    },
    [
      boundaryOrganismId,
      enteredOrganismId,
      isAuthenticated,
      personalOrganismId,
      commitVisorSearchParams,
      visorRoute.organismId,
    ],
  );

  const handleOpenApp = useCallback(
    (appId: string) => {
      handleOpenAppRequest({ appId });
    },
    [handleOpenAppRequest],
  );

  const handleCloseVisor = useCallback(() => {
    updateVisorRoute({
      mode: 'closed',
      appId: null,
      organismId: null,
    });
  }, [updateVisorRoute]);

  const handleLogout = useCallback(() => {
    logoutSession()
      .catch(() => {
        // Best effort: clear local auth state even if API logout fails.
      })
      .finally(() => {
        clearSessionId();
        window.location.reload();
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let settleTimerId: number | null = null;
    const startedAt = performance.now();

    const settleWithMinimumDuration = (nextState: LoadState) => {
      const elapsedMs = performance.now() - startedAt;
      const remainingMs = Math.max(0, INITIAL_LOADING_MIN_MS - elapsedMs);

      settleTimerId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setState(nextState);
      }, remainingMs);
    };

    fetchWorldMap()
      .then((response) => {
        if (!response.worldMapId) {
          throw new Error('World map pointer is not available from API');
        }

        settleWithMinimumDuration({
          worldMapId: response.worldMapId,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load world map pointer';
        settleWithMinimumDuration({
          worldMapId: null,
          loading: false,
          error: message,
        });
      });

    return () => {
      cancelled = true;
      if (settleTimerId !== null) {
        window.clearTimeout(settleTimerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPersonalOrganismId(undefined);
      return;
    }

    if (personalOrganismId !== undefined) {
      return;
    }

    let cancelled = false;
    fetchSession()
      .then((session) => {
        if (cancelled) {
          return;
        }
        setPersonalOrganismId(session.personalOrganismId ?? null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPersonalOrganismId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, personalOrganismId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSecretLoginShortcut(event)) {
        return;
      }

      if (readSessionId()) {
        return;
      }

      event.preventDefault();

      loginWithPassword(DEV_SHORTCUT_LOGIN_EMAIL, DEV_SHORTCUT_LOGIN_PASSWORD)
        .then((response) => {
          localStorage.setItem('sessionId', response.sessionId);
          window.location.reload();
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Secret login failed';
          console.error(`Secret login failed: ${message}`);
        });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onPopState = () => {
      setVisorRoute(readVisorRouteFromWindow());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (arrivalPlayed) {
      return;
    }

    if (state.loading || state.error || !state.worldMapId) {
      return;
    }

    setArrivalPlayed(true);
    setArrivalVisible(true);

    const timeoutId = window.setTimeout(() => {
      setArrivalVisible(false);
    }, ARRIVAL_OVERLAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [arrivalPlayed, state.error, state.loading, state.worldMapId]);

  if (state.loading) {
    return (
      <div className="platform-shell platform-shell-status" data-status="loading">
        {renderArrivalOverlay('loading')}
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
        onEnteredOrganismChange={setEnteredOrganismId}
        onBoundaryOrganismChange={setBoundaryOrganismId}
        onSpatialContextChange={handleSpatialContextChange}
      />
      <VisorHud
        mode={visorRoute.mode}
        appId={visorRoute.appId}
        organismId={visorRoute.organismId}
        personalOrganismId={personalOrganismId ?? null}
        appRouteState={appRouteState}
        spatialContext={spatialContext}
        altitude={altitude}
        showAltitudeControls={!isInInterior}
        showCompass={!isInInterior}
        showLogoutButton={isAuthenticated}
        navigationLabel={isInInterior ? 'Organism interior' : null}
        onChangeAltitude={handleAltitudeChangeRequested}
        onGoBack={handleBackRequested}
        canGoBack={Boolean(backHandler)}
        onOpenApp={handleOpenApp}
        onOpenAppRequest={handleOpenAppRequest}
        onChangeAppRouteState={handleChangeAppRouteState}
        onCloseVisor={handleCloseVisor}
        onLogout={handleLogout}
      />
      {arrivalVisible ? renderArrivalOverlay('arrival') : null}
    </div>
  );
}
