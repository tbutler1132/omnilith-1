/**
 * Visor HUD root for web-next.
 *
 * Provides the persistent HUD overlay layer and composes widget lanes
 * for both closed HUD mode and open visor app mode.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Altitude } from '../../contracts/altitude.js';
import { OpenVisorShell } from '../open/index.js';
import type { VisorMode } from '../visor-route.js';
import { AppDockSlot, SpatialControlsSlot } from './slots/index.js';
import { VisorWidgetLane } from './widget-lane.js';
import { CompassWidget, MapLegendWidget } from './widgets/index.js';

type OpenVisorPhase = 'hidden' | 'opening' | 'open' | 'closing';

const OPEN_VISOR_OPEN_MS = 520;
const OPEN_VISOR_CLOSE_MS = 420;

interface VisorHudProps {
  readonly mode: VisorMode;
  readonly appId: string | null;
  readonly altitude: Altitude;
  readonly showAltitudeControls: boolean;
  readonly showCompass: boolean;
  readonly navigationLabel?: string | null;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
  readonly onGoBack: () => void;
  readonly canGoBack: boolean;
  readonly onOpenApp: (appId: string) => void;
  readonly onCloseVisor: () => void;
}

export function VisorHud({
  mode,
  appId,
  altitude,
  showAltitudeControls,
  showCompass,
  navigationLabel,
  onChangeAltitude,
  onGoBack,
  canGoBack,
  onOpenApp,
  onCloseVisor,
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
  const openPhaseForShell: Exclude<OpenVisorPhase, 'hidden'> = openVisorPhase === 'hidden' ? 'open' : openVisorPhase;

  return (
    <div className="visor-hud-layer">
      {showClosedHud ? (
        <>
          <SpatialControlsSlot
            altitude={altitude}
            showAltitudeControls={showAltitudeControls}
            navigationLabel={navigationLabel}
            onChangeAltitude={onChangeAltitude}
            onGoBack={onGoBack}
            canGoBack={canGoBack}
          />
          <AppDockSlot onOpenApp={onOpenApp} />
          {showCompass ? (
            <VisorWidgetLane>
              <CompassWidget />
              <MapLegendWidget />
            </VisorWidgetLane>
          ) : null}
        </>
      ) : null}

      {showOpenVisor ? (
        <OpenVisorShell
          appId={presentedAppId}
          phase={openPhaseForShell}
          onOpenApp={onOpenApp}
          onRequestClose={onCloseVisor}
        />
      ) : null}
    </div>
  );
}
