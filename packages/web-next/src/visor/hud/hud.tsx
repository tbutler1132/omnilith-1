/**
 * Visor HUD root for web-next.
 *
 * Provides the persistent HUD overlay layer and composes widget lanes
 * for both closed HUD mode and open visor app mode.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Altitude } from '../../contracts/altitude.js';
import type { VisorAppOpenRequest } from '../apps/app-contract.js';
import type { VisorAppSpatialContext } from '../apps/spatial-context-contract.js';
import { OpenVisorShell } from '../open/index.js';
import type { VisorMode } from '../visor-route.js';
import { AppDockSlot, SpatialAltitudeSlot, SpatialControlsSlot } from './slots/index.js';
import { VisorWidgetLane } from './widget-lane.js';
import { CompassWidget, MapLegendWidget, MapReadoutWidget } from './widgets/index.js';

type OpenVisorPhase = 'hidden' | 'opening' | 'open' | 'closing';

const OPEN_VISOR_OPEN_MS = 520;
const OPEN_VISOR_CLOSE_MS = 420;

interface VisorHudProps {
  readonly mode: VisorMode;
  readonly appId: string | null;
  readonly organismId: string | null;
  readonly personalOrganismId?: string | null;
  readonly appRouteState?: unknown;
  readonly spatialContext: VisorAppSpatialContext;
  readonly altitude: Altitude;
  readonly showAltitudeControls: boolean;
  readonly showCompass: boolean;
  readonly showLogoutButton: boolean;
  readonly navigationCurrentLabel: string;
  readonly navigationUpTargetLabel: string | null;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
  readonly onGoUp: () => void;
  readonly showNavigationUpControl: boolean;
  readonly canGoUp: boolean;
  readonly onOpenApp: (appId: string) => void;
  readonly onOpenAppRequest: (request: VisorAppOpenRequest) => void;
  readonly onChangeAppRouteState?: (nextState: unknown) => void;
  readonly onCloseVisor: () => void;
  readonly onLogout: () => void;
}

export function VisorHud({
  mode,
  appId,
  organismId,
  personalOrganismId,
  appRouteState,
  spatialContext,
  altitude,
  showAltitudeControls,
  showCompass,
  showLogoutButton,
  navigationCurrentLabel,
  navigationUpTargetLabel,
  onChangeAltitude,
  onGoUp,
  showNavigationUpControl,
  canGoUp,
  onOpenApp,
  onOpenAppRequest,
  onChangeAppRouteState,
  onCloseVisor,
  onLogout,
}: VisorHudProps) {
  const [openVisorPhase, setOpenVisorPhase] = useState<OpenVisorPhase>(mode === 'open' ? 'opening' : 'hidden');
  const [presentedAppId, setPresentedAppId] = useState<string | null>(appId);
  const phaseTimerRef = useRef<number | null>(null);

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current !== null) {
      window.clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearPhaseTimer();

    if (mode === 'open') {
      setPresentedAppId(appId);
      setOpenVisorPhase((previous) => (previous === 'open' ? 'open' : 'opening'));
      phaseTimerRef.current = window.setTimeout(() => {
        setOpenVisorPhase('open');
        phaseTimerRef.current = null;
      }, OPEN_VISOR_OPEN_MS);
      return;
    }

    let shouldAnimateClose = false;
    setOpenVisorPhase((previous) => {
      if (previous === 'hidden') {
        return previous;
      }

      shouldAnimateClose = true;
      return 'closing';
    });

    if (shouldAnimateClose) {
      phaseTimerRef.current = window.setTimeout(() => {
        setOpenVisorPhase('hidden');
        setPresentedAppId(null);
        phaseTimerRef.current = null;
      }, OPEN_VISOR_CLOSE_MS);
    }
  }, [appId, clearPhaseTimer, mode]);

  useEffect(() => clearPhaseTimer, [clearPhaseTimer]);

  const showOpenVisor = openVisorPhase !== 'hidden';
  const showClosedHud = mode === 'closed';
  const showWidgetLane = showLogoutButton || showCompass || showAltitudeControls;
  const openPhaseForShell: Exclude<OpenVisorPhase, 'hidden'> = openVisorPhase === 'hidden' ? 'open' : openVisorPhase;

  return (
    <div className="visor-hud-layer">
      {showClosedHud ? (
        <>
          <SpatialControlsSlot
            currentLabel={navigationCurrentLabel}
            upTargetLabel={navigationUpTargetLabel}
            onGoUp={onGoUp}
            showUpControl={showNavigationUpControl}
            canGoUp={canGoUp}
          />
          <SpatialAltitudeSlot
            altitude={altitude}
            showAltitudeControls={showAltitudeControls}
            onChangeAltitude={onChangeAltitude}
          />
          <AppDockSlot onOpenApp={onOpenApp} />
          {showWidgetLane ? (
            <VisorWidgetLane>
              {showLogoutButton ? (
                <button type="button" className="visor-widget visor-logout-widget" onClick={onLogout}>
                  Log out
                </button>
              ) : null}
              {showAltitudeControls ? <MapReadoutWidget spatialContext={spatialContext} /> : null}
              {showCompass ? (
                <>
                  <CompassWidget />
                  <MapLegendWidget />
                </>
              ) : null}
            </VisorWidgetLane>
          ) : null}
        </>
      ) : null}

      {showOpenVisor ? (
        <OpenVisorShell
          appId={presentedAppId}
          organismId={organismId}
          personalOrganismId={personalOrganismId}
          appRouteState={appRouteState}
          spatialContext={spatialContext}
          phase={openPhaseForShell}
          onOpenApp={onOpenApp}
          onOpenAppRequest={onOpenAppRequest}
          onChangeAppRouteState={onChangeAppRouteState}
          onRequestClose={onCloseVisor}
        />
      ) : null}
    </div>
  );
}
