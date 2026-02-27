/**
 * Platform shell for web-next.
 *
 * Verifies web-next is wired to the live API and world map pointer,
 * then renders the plain map slice with the minimal closed HUD scaffold.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSession, loginWithPassword, logoutSession } from '../api/auth.js';
import { fetchWorldMap } from '../api/fetch-world-map.js';
import { clearSessionId, readSessionId } from '../api/session.js';
import type { Altitude } from '../contracts/altitude.js';
import { SpaceStage, type SpaceStageSpatialSnapshot } from '../space/space-stage.js';
import { useEntryOrganisms } from '../space/use-entry-organisms.js';
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
import { shouldPromptCrossAppNavigation } from './should-prompt-cross-app-navigation.js';

type PanDirection = 'up' | 'down' | 'left' | 'right';

interface LoadState {
  readonly worldMapId: string | null;
  readonly loading: boolean;
  readonly error: string | null;
}

interface PendingCrossAppNavigation {
  readonly sourceAppId: string;
  readonly request: VisorAppOpenRequest;
}

const ARRIVAL_OVERLAY_MS = 1400;
const INITIAL_LOADING_MIN_MS = 900;
const WORLD_MAP_LABEL = 'World Map';

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
  const [centerMapHandler, setCenterMapHandler] = useState<(() => void) | null>(null);
  const [panMapHandler, setPanMapHandler] = useState<((direction: PanDirection) => void) | null>(null);
  const [backHandler, setBackHandler] = useState<(() => void) | null>(null);
  const [state, setState] = useState<LoadState>({
    worldMapId: null,
    loading: true,
    error: null,
  });
  const [personalOrganismId, setPersonalOrganismId] = useState<string | null | undefined>(undefined);
  const [arrivalPlayed, setArrivalPlayed] = useState(false);
  const [arrivalVisible, setArrivalVisible] = useState(false);
  const [pendingCrossAppNavigation, setPendingCrossAppNavigation] = useState<PendingCrossAppNavigation | null>(null);
  const [spatialContext, setSpatialContext] = useState<VisorAppSpatialContext>(() => createEmptySpatialContext());
  const isAuthenticated = readSessionId() !== null;
  const activeApp = resolveVisorApp(visorRoute.appId);
  const appRouteState =
    typeof window !== 'undefined' && visorRoute.mode === 'open' && activeApp.routeCodec
      ? activeApp.routeCodec.parseRoute(new URLSearchParams(window.location.search))
      : null;
  const boundaryPath = spatialContext.boundaryPath;
  const currentBoundaryPathId = boundaryPath.length > 0 ? boundaryPath[boundaryPath.length - 1] : null;
  const parentBoundaryPathId = boundaryPath.length > 1 ? boundaryPath[boundaryPath.length - 2] : null;
  const isWorldMapLevel = enteredOrganismId === null && currentBoundaryPathId === null;
  const currentNavOrganismId = enteredOrganismId ?? currentBoundaryPathId;
  const parentNavOrganismId = enteredOrganismId ? currentBoundaryPathId : parentBoundaryPathId;
  const navOrganismIds = useMemo(() => {
    const nextIds = [currentNavOrganismId, parentNavOrganismId].filter(
      (organismId): organismId is string => typeof organismId === 'string' && organismId.length > 0,
    );
    return Array.from(new Set(nextIds));
  }, [currentNavOrganismId, parentNavOrganismId]);
  const { byId: navOrganismsById } = useEntryOrganisms(navOrganismIds);
  const navigationCurrentLabel = isWorldMapLevel
    ? WORLD_MAP_LABEL
    : currentNavOrganismId
      ? (navOrganismsById[currentNavOrganismId]?.name ?? currentNavOrganismId)
      : WORLD_MAP_LABEL;
  const navigationUpTargetLabel =
    parentNavOrganismId === null
      ? WORLD_MAP_LABEL
      : (navOrganismsById[parentNavOrganismId]?.name ?? parentNavOrganismId);
  const showNavigationUpControl = !isWorldMapLevel;
  const canGoUp = Boolean(backHandler);

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

  const handleCenterMapControlReady = useCallback((handler: (() => void) | null) => {
    setCenterMapHandler(() => handler);
  }, []);

  const handlePanMapControlReady = useCallback((handler: ((direction: PanDirection) => void) | null) => {
    setPanMapHandler(() => handler);
  }, []);

  const handleAltitudeChangeRequested = useCallback(
    (direction: 'in' | 'out') => {
      changeAltitudeHandler?.(direction);
    },
    [changeAltitudeHandler],
  );

  const handleCenterMapRequested = useCallback(() => {
    centerMapHandler?.();
  }, [centerMapHandler]);

  const handlePanMapRequested = useCallback(
    (direction: PanDirection) => {
      panMapHandler?.(direction);
    },
    [panMapHandler],
  );

  const handleBackRequested = useCallback(() => {
    backHandler?.();
  }, [backHandler]);

  const handleSpatialContextChange = useCallback((snapshot: SpaceStageSpatialSnapshot) => {
    setSpatialContext({
      mapOrganismId: snapshot.mapOrganismId,
      mapSize: snapshot.mapSize,
      mapEntries: snapshot.mapEntries,
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

      // Ignore late app route sync writes after close has been requested.
      if (visorRoute.mode !== 'open') {
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
    [activeApp, commitVisorSearchParams, visorRoute.mode, visorRoute.organismId],
  );

  const executeOpenAppRequest = useCallback(
    async (request: VisorAppOpenRequest) => {
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

  const handleOpenAppRequest = useCallback(
    (request: VisorAppOpenRequest) => {
      const currentAppId = visorRoute.mode === 'open' ? visorRoute.appId : null;

      if (
        currentAppId &&
        shouldPromptCrossAppNavigation({
          currentAppId,
          requestedAppId: request.appId,
        })
      ) {
        setPendingCrossAppNavigation({
          sourceAppId: currentAppId,
          request,
        });
        return;
      }

      setPendingCrossAppNavigation(null);
      void executeOpenAppRequest(request);
    },
    [executeOpenAppRequest, visorRoute.appId, visorRoute.mode],
  );

  const handleOpenApp = useCallback(
    (appId: string) => {
      setPendingCrossAppNavigation(null);
      void executeOpenAppRequest({ appId });
    },
    [executeOpenAppRequest],
  );

  const handleDeclineCrossAppNavigation = useCallback(() => {
    setPendingCrossAppNavigation(null);
  }, []);

  const handleConfirmCrossAppNavigation = useCallback(() => {
    if (!pendingCrossAppNavigation) {
      return;
    }

    const request = pendingCrossAppNavigation.request;
    setPendingCrossAppNavigation(null);
    void executeOpenAppRequest(request);
  }, [executeOpenAppRequest, pendingCrossAppNavigation]);

  const handleCloseVisor = useCallback(() => {
    setPendingCrossAppNavigation(null);
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
    if (!pendingCrossAppNavigation) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setPendingCrossAppNavigation(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingCrossAppNavigation]);

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

  const pendingCrossAppSourceLabel = pendingCrossAppNavigation
    ? resolveVisorApp(pendingCrossAppNavigation.sourceAppId).label
    : null;
  const pendingCrossAppDestinationLabel = pendingCrossAppNavigation
    ? resolveVisorApp(pendingCrossAppNavigation.request.appId).label
    : null;

  return (
    <div className="platform-shell" data-status="ready">
      <SpaceStage
        worldMapId={state.worldMapId}
        onAltitudeChange={setAltitude}
        onAltitudeControlReady={handleAltitudeControlReady}
        onCenterControlReady={handleCenterMapControlReady}
        onPanControlReady={handlePanMapControlReady}
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
        navigationCurrentLabel={navigationCurrentLabel}
        navigationUpTargetLabel={navigationUpTargetLabel}
        onChangeAltitude={handleAltitudeChangeRequested}
        onCenterMap={handleCenterMapRequested}
        onPanMap={handlePanMapRequested}
        onGoUp={handleBackRequested}
        showNavigationUpControl={showNavigationUpControl}
        canGoUp={canGoUp}
        onOpenApp={handleOpenApp}
        onOpenAppRequest={handleOpenAppRequest}
        onChangeAppRouteState={handleChangeAppRouteState}
        onCloseVisor={handleCloseVisor}
        onLogout={handleLogout}
      />
      {pendingCrossAppNavigation ? (
        <div className="visor-cross-app-prompt-backdrop" role="presentation">
          <section
            className="visor-cross-app-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="visor-cross-app-prompt-title"
          >
            <h2 id="visor-cross-app-prompt-title" className="visor-cross-app-prompt-title">
              Open a different visor app?
            </h2>
            <p className="visor-cross-app-prompt-copy">
              You are moving from <strong>{pendingCrossAppSourceLabel}</strong> to{' '}
              <strong>{pendingCrossAppDestinationLabel}</strong>.
            </p>
            <div className="visor-cross-app-prompt-actions">
              <button type="button" className="visor-cross-app-prompt-button" onClick={handleDeclineCrossAppNavigation}>
                Stay in {pendingCrossAppSourceLabel}
              </button>
              <button
                type="button"
                className="visor-cross-app-prompt-button visor-cross-app-prompt-button--primary"
                onClick={handleConfirmCrossAppNavigation}
              >
                Open {pendingCrossAppDestinationLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {arrivalVisible ? renderArrivalOverlay('arrival') : null}
    </div>
  );
}
