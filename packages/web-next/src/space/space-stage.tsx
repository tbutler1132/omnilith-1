/**
 * Space stage map surface for web-next Slice 1.
 *
 * Renders the world map grid with drag navigation plus lightweight organism
 * markers from spatial-map entries.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import { GroundPlane } from './ground-plane.js';
import { OrganismInterior } from './interior/organism-interior.js';
import { MapViewport } from './map-viewport.js';
import { SpaceOrganismLayer } from './space-organism-layer.js';
import { resolveMarkerActivationIntent, shouldClearFocusedOrganism } from './space-stage-policy.js';
import { useEntryOrganisms } from './use-entry-organisms.js';
import { useSpatialMap } from './use-spatial-map.js';
import { useViewport } from './use-viewport.js';
import { frameOrganism, frameOrganismEnter } from './viewport-math.js';

interface SpaceStageProps {
  readonly worldMapId: string;
  readonly onAltitudeChange: (altitude: Altitude) => void;
  readonly onAltitudeControlReady: (handler: ((direction: 'in' | 'out') => void) | null) => void;
  readonly onBackControlReady: (handler: (() => void) | null) => void;
  readonly onInteriorChange: (isInInterior: boolean) => void;
}

interface FocusPoint {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
}

interface MapHistoryEntry {
  readonly mapId: string;
  readonly returnFocus: FocusPoint | null;
}

interface MarkerActivationInput {
  readonly organismId: string;
  readonly enterTargetMapId: string | null;
  readonly contentTypeId: string | null;
  readonly x: number;
  readonly y: number;
}

type TransitionPhase = 'idle' | 'entering' | 'exiting';

const ENTER_TRANSITION_MS = 700;
const EXIT_TRANSITION_MS = 500;
const FOCUS_TRANSITION_MS = 320;
const INTERIOR_ENTER_TRANSITION_MS = 300;
const INTERIOR_EXIT_TRANSITION_MS = 260;

export function SpaceStage({
  worldMapId,
  onAltitudeChange,
  onAltitudeControlReady,
  onBackControlReady,
  onInteriorChange,
}: SpaceStageProps) {
  const [currentMapId, setCurrentMapId] = useState(worldMapId);
  const [mapHistory, setMapHistory] = useState<ReadonlyArray<MapHistoryEntry>>([]);
  const [enteredOrganismId, setEnteredOrganismId] = useState<string | null>(null);
  const [focusedOrganismId, setFocusedOrganismId] = useState<string | null>(null);
  const [pendingFocusAfterSwitch, setPendingFocusAfterSwitch] = useState<FocusPoint | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [transitionOpacity, setTransitionOpacity] = useState(0);
  const fadeFrameRef = useRef<number | null>(null);
  const previousAltitudeRef = useRef<Altitude | null>(null);
  const interiorTransitioningRef = useRef(false);

  const { width, height, entries, entryCount, loading, error } = useSpatialMap(currentMapId);
  const entryIds = useMemo(() => entries.map((entry) => entry.organismId), [entries]);
  const { byId: entryOrganismsById } = useEntryOrganisms(entryIds);
  const { viewport, screenSize, altitude, containerRef, setViewport, animateTo, changeAltitude } = useViewport({
    mapWidth: width,
    mapHeight: height,
  });

  const cancelFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);

  const animateTransitionOpacity = useCallback(
    (from: number, to: number, durationMs: number, onComplete?: () => void) => {
      cancelFade();
      setTransitionOpacity(from);
      const startedAt = performance.now();

      const step = (now: number) => {
        const elapsed = now - startedAt;
        const t = Math.min(elapsed / durationMs, 1);
        const eased = 1 - (1 - t) ** 3;
        setTransitionOpacity(from + (to - from) * eased);

        if (t < 1) {
          fadeFrameRef.current = requestAnimationFrame(step);
          return;
        }

        fadeFrameRef.current = null;
        onComplete?.();
      };

      fadeFrameRef.current = requestAnimationFrame(step);
    },
    [cancelFade],
  );

  useEffect(() => {
    setCurrentMapId(worldMapId);
    setMapHistory([]);
    setEnteredOrganismId(null);
    setFocusedOrganismId(null);
    setPendingFocusAfterSwitch(null);
    setTransitionPhase('idle');
    setTransitionOpacity(0);
    cancelFade();
  }, [cancelFade, worldMapId]);

  useEffect(() => cancelFade, [cancelFade]);

  useEffect(() => {
    if (!pendingFocusAfterSwitch) {
      return;
    }

    if (loading) {
      return;
    }

    animateTo(frameOrganism(pendingFocusAfterSwitch.x, pendingFocusAfterSwitch.y), {
      durationMs: FOCUS_TRANSITION_MS,
    });
    setFocusedOrganismId(null);
    setPendingFocusAfterSwitch(null);
  }, [animateTo, loading, pendingFocusAfterSwitch]);

  const runExitTransition = useCallback(
    (afterEnterComplete: () => void) => {
      setTransitionPhase('entering');
      animateTransitionOpacity(0, 1, ENTER_TRANSITION_MS, () => {
        afterEnterComplete();
        setTransitionPhase('exiting');
        animateTransitionOpacity(1, 0, EXIT_TRANSITION_MS, () => {
          setTransitionPhase('idle');
        });
      });
    },
    [animateTransitionOpacity],
  );

  const handleEnterMap = useCallback(
    (targetMapId: string, from: FocusPoint) => {
      if (transitionPhase !== 'idle') {
        return;
      }

      if (targetMapId === currentMapId) {
        return;
      }

      animateTo(frameOrganismEnter(from.x, from.y), { durationMs: ENTER_TRANSITION_MS });
      runExitTransition(() => {
        setMapHistory((previous) => [
          ...previous,
          {
            mapId: currentMapId,
            returnFocus: from,
          },
        ]);
        setCurrentMapId(targetMapId);
        setEnteredOrganismId(null);
        setFocusedOrganismId(null);
        setPendingFocusAfterSwitch(null);
      });
    },
    [animateTo, currentMapId, runExitTransition, transitionPhase],
  );

  const handleEnterOrganism = useCallback(
    (organismId: string, from: FocusPoint) => {
      if (transitionPhase !== 'idle' || interiorTransitioningRef.current) {
        return;
      }

      interiorTransitioningRef.current = true;
      animateTo(frameOrganismEnter(from.x, from.y), {
        durationMs: INTERIOR_ENTER_TRANSITION_MS,
        onComplete: () => {
          setEnteredOrganismId(organismId);
          setFocusedOrganismId(null);
          interiorTransitioningRef.current = false;
        },
      });
    },
    [animateTo, transitionPhase],
  );

  const handleExitOrganism = useCallback(() => {
    if (transitionPhase !== 'idle' || interiorTransitioningRef.current) {
      return;
    }

    const exitX = viewport.x;
    const exitY = viewport.y;

    interiorTransitioningRef.current = true;
    setEnteredOrganismId(null);
    setFocusedOrganismId(null);
    animateTo(frameOrganism(exitX, exitY), {
      durationMs: INTERIOR_EXIT_TRANSITION_MS,
      onComplete: () => {
        interiorTransitioningRef.current = false;
      },
    });
  }, [animateTo, transitionPhase, viewport.x, viewport.y]);

  const handleGoBack = useCallback(() => {
    if (transitionPhase !== 'idle' || interiorTransitioningRef.current) {
      return;
    }

    if (enteredOrganismId) {
      handleExitOrganism();
      return;
    }

    const previous = mapHistory[mapHistory.length - 1];
    if (!previous) {
      return;
    }

    animateTo(frameOrganismEnter(viewport.x, viewport.y), { durationMs: ENTER_TRANSITION_MS });
    runExitTransition(() => {
      setMapHistory((current) => current.slice(0, -1));
      setCurrentMapId(previous.mapId);
      setFocusedOrganismId(null);
      setPendingFocusAfterSwitch(previous.returnFocus);
    });
  }, [
    animateTo,
    enteredOrganismId,
    handleExitOrganism,
    mapHistory,
    runExitTransition,
    transitionPhase,
    viewport.x,
    viewport.y,
  ]);

  const handleActivateMarker = useCallback(
    (input: MarkerActivationInput) => {
      if (transitionPhase !== 'idle' || interiorTransitioningRef.current) {
        return;
      }

      const canEnterMap = Boolean(input.enterTargetMapId);
      const canEnterInterior = Boolean(input.contentTypeId);
      const isSameMarker = focusedOrganismId === input.organismId;
      const intent = resolveMarkerActivationIntent({
        altitude,
        isSameMarker,
        canEnterMap,
        canEnterInterior,
      });

      if (intent === 'enter-map') {
        if (input.enterTargetMapId) {
          handleEnterMap(input.enterTargetMapId, {
            organismId: input.organismId,
            x: input.x,
            y: input.y,
          });
        }

        return;
      }

      if (intent === 'enter-interior') {
        if (input.contentTypeId) {
          handleEnterOrganism(input.organismId, {
            organismId: input.organismId,
            x: input.x,
            y: input.y,
          });
        }

        return;
      }

      setFocusedOrganismId(input.organismId);
      animateTo(frameOrganism(input.x, input.y), { durationMs: FOCUS_TRANSITION_MS });
    },
    [altitude, animateTo, focusedOrganismId, handleEnterMap, handleEnterOrganism, transitionPhase],
  );

  const canGoBack = (enteredOrganismId !== null || mapHistory.length > 0) && transitionPhase === 'idle';

  useEffect(() => {
    onAltitudeChange(altitude);
  }, [altitude, onAltitudeChange]);

  useEffect(() => {
    const previousAltitude = previousAltitudeRef.current;
    if (shouldClearFocusedOrganism({ previousAltitude, nextAltitude: altitude })) {
      setFocusedOrganismId(null);
    }

    previousAltitudeRef.current = altitude;
  }, [altitude]);

  useEffect(() => {
    onAltitudeControlReady(changeAltitude);
    return () => onAltitudeControlReady(null);
  }, [changeAltitude, onAltitudeControlReady]);

  useEffect(() => {
    onBackControlReady(canGoBack ? handleGoBack : null);
    return () => onBackControlReady(null);
  }, [canGoBack, handleGoBack, onBackControlReady]);

  useEffect(() => {
    onInteriorChange(enteredOrganismId !== null);
  }, [enteredOrganismId, onInteriorChange]);

  useEffect(() => {
    if (enteredOrganismId === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      handleGoBack();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enteredOrganismId, handleGoBack]);

  if (loading) {
    return (
      <main className="space-map" ref={containerRef} aria-label="Space map">
        <div className="space-map-status">Loading world map...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-map" ref={containerRef} aria-label="Space map">
        <div className="space-map-status">{error}</div>
      </main>
    );
  }

  return (
    <main className="space-map" ref={containerRef} aria-label="Space map">
      <MapViewport viewport={viewport} screenSize={screenSize} onViewportChange={setViewport}>
        <GroundPlane width={width} height={height} />
        <SpaceOrganismLayer
          entries={entries}
          altitude={altitude}
          entryOrganismsById={entryOrganismsById}
          focusedOrganismId={focusedOrganismId}
          onActivateMarker={handleActivateMarker}
        />
      </MapViewport>

      {enteredOrganismId ? <OrganismInterior organismId={enteredOrganismId} /> : null}

      <div
        className={`space-transition-overlay space-transition-overlay--${transitionPhase}`}
        style={{ opacity: transitionOpacity }}
        aria-hidden
      />

      {enteredOrganismId ? null : (
        <div className="space-map-status">
          <p>Map: {currentMapId}</p>
          <p>Entries: {entryCount}</p>
          <p>Depth: {mapHistory.length}</p>
          <p>Altitude: {altitude}</p>
          <p>Entered: none</p>
          <p>High/Mid: focus then enter. Close: enter directly.</p>
        </div>
      )}
    </main>
  );
}
