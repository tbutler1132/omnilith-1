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
import {
  DEFAULT_ALTITUDE_ZOOM_PROFILE,
  frameOrganism,
  frameOrganismEnter,
  frameOrganismFocus,
  nextAltitude,
} from './viewport-math.js';

interface SpaceStageProps {
  readonly worldMapId: string;
  readonly onAltitudeChange: (altitude: Altitude) => void;
  readonly onAltitudeControlReady: (handler: ((direction: 'in' | 'out') => void) | null) => void;
  readonly onBackControlReady: (handler: (() => void) | null) => void;
  readonly onInteriorChange: (isInInterior: boolean) => void;
  readonly onEnteredOrganismChange: (organismId: string | null) => void;
  readonly onBoundaryOrganismChange: (organismId: string | null) => void;
  readonly onSpatialContextChange: (snapshot: SpaceStageSpatialSnapshot) => void;
}

export interface SpaceStageSpatialSnapshot {
  readonly mapOrganismId: string;
  readonly focusedOrganismId: string | null;
  readonly cursorWorld: {
    readonly x: number;
    readonly y: number;
  } | null;
  readonly hoveredEntry: {
    readonly organismId: string;
    readonly name: string;
    readonly contentTypeId: string | null;
    readonly x: number;
    readonly y: number;
    readonly size: number;
  } | null;
  readonly focusedEntry: {
    readonly organismId: string;
    readonly name: string;
    readonly contentTypeId: string | null;
    readonly x: number;
    readonly y: number;
    readonly size: number;
  } | null;
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly altitude: Altitude;
  };
  readonly surfaceSelection: ReadonlyArray<string>;
  readonly boundaryPath: ReadonlyArray<string>;
}

interface FocusPoint {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
}

interface MapHistoryEntry {
  readonly mapId: string;
  readonly returnFocus: FocusPoint | null;
  readonly boundaryOrganismId: string | null;
}

interface MarkerActivationInput {
  readonly organismId: string;
  readonly enterTargetMapId: string | null;
  readonly contentTypeId: string | null;
  readonly x: number;
  readonly y: number;
}

interface SurfaceEntrySnapshot {
  readonly organismId: string;
  readonly name: string;
  readonly contentTypeId: string | null;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

type TransitionPhase = 'idle' | 'entering' | 'exiting';

const ENTER_TRANSITION_MS = 700;
const EXIT_TRANSITION_MS = 500;
const FOCUS_TRANSITION_MS = 320;
const INTERIOR_ENTER_TRANSITION_MS = 300;
const INTERIOR_EXIT_TRANSITION_MS = 260;
const ALTITUDE_RECALIBRATION_LEAD_MS = 240;

function resolveSurfaceEntrySnapshot(
  organismId: string | null,
  entriesById: ReadonlyMap<string, { x: number; y: number; size: number }>,
  entryMetadataById: Readonly<Record<string, { name: string; contentTypeId: string | null }>>,
): SurfaceEntrySnapshot | null {
  if (!organismId) {
    return null;
  }

  const entry = entriesById.get(organismId);
  if (!entry) {
    return null;
  }

  const metadata = entryMetadataById[organismId];
  return {
    organismId,
    name: metadata?.name ?? organismId,
    contentTypeId: metadata?.contentTypeId ?? null,
    x: entry.x,
    y: entry.y,
    size: entry.size,
  };
}

function normalizeEntrySize(size: number | undefined): number {
  if (typeof size !== 'number' || !Number.isFinite(size)) {
    return 1;
  }

  return Math.max(0.0001, size);
}

export function SpaceStage({
  worldMapId,
  onAltitudeChange,
  onAltitudeControlReady,
  onBackControlReady,
  onInteriorChange,
  onEnteredOrganismChange,
  onBoundaryOrganismChange,
  onSpatialContextChange,
}: SpaceStageProps) {
  const [currentMapId, setCurrentMapId] = useState(worldMapId);
  const [mapHistory, setMapHistory] = useState<ReadonlyArray<MapHistoryEntry>>([]);
  const [currentBoundaryOrganismId, setCurrentBoundaryOrganismId] = useState<string | null>(null);
  const [enteredOrganismId, setEnteredOrganismId] = useState<string | null>(null);
  const [focusedOrganismId, setFocusedOrganismId] = useState<string | null>(null);
  const [hoveredOrganismId, setHoveredOrganismId] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [pendingFocusAfterSwitch, setPendingFocusAfterSwitch] = useState<FocusPoint | null>(null);
  const [groundPlaneRecalibrationEpoch, setGroundPlaneRecalibrationEpoch] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [transitionOpacity, setTransitionOpacity] = useState(0);
  const fadeFrameRef = useRef<number | null>(null);
  const altitudeDelayTimerRef = useRef<number | null>(null);
  const previousAltitudeRef = useRef<Altitude | null>(null);
  const interiorTransitioningRef = useRef(false);

  const { width, height, entries, loading, error } = useSpatialMap(currentMapId);
  const entryIds = useMemo(() => entries.map((entry) => entry.organismId), [entries]);
  const entriesById = useMemo(
    () =>
      new Map(
        entries.map((entry) => [
          entry.organismId,
          {
            x: entry.x,
            y: entry.y,
            size: normalizeEntrySize(entry.size),
          },
        ]),
      ),
    [entries],
  );
  const { byId: entryOrganismsById } = useEntryOrganisms(entryIds);
  const hoveredEntry = useMemo(
    () => resolveSurfaceEntrySnapshot(hoveredOrganismId, entriesById, entryOrganismsById),
    [entriesById, entryOrganismsById, hoveredOrganismId],
  );
  const focusedEntry = useMemo(
    () => resolveSurfaceEntrySnapshot(focusedOrganismId, entriesById, entryOrganismsById),
    [entriesById, entryOrganismsById, focusedOrganismId],
  );
  const { viewport, screenSize, altitude, altitudeZoomProfile, containerRef, setViewport, animateTo, changeAltitude } =
    useViewport({
      mapWidth: width,
      mapHeight: height,
    });
  const mapZoomScale = altitudeZoomProfile.high / DEFAULT_ALTITUDE_ZOOM_PROFILE.high;

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
    if (altitudeDelayTimerRef.current !== null) {
      window.clearTimeout(altitudeDelayTimerRef.current);
      altitudeDelayTimerRef.current = null;
    }

    setCurrentMapId(worldMapId);
    setMapHistory([]);
    setCurrentBoundaryOrganismId(null);
    setEnteredOrganismId(null);
    setFocusedOrganismId(null);
    setHoveredOrganismId(null);
    setCursorWorld(null);
    setPendingFocusAfterSwitch(null);
    setTransitionPhase('idle');
    setTransitionOpacity(0);
    cancelFade();
  }, [cancelFade, worldMapId]);

  useEffect(() => cancelFade, [cancelFade]);

  useEffect(() => {
    return () => {
      if (altitudeDelayTimerRef.current !== null) {
        window.clearTimeout(altitudeDelayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingFocusAfterSwitch) {
      return;
    }

    if (loading) {
      return;
    }

    animateTo(frameOrganismFocus(pendingFocusAfterSwitch.x, pendingFocusAfterSwitch.y, altitudeZoomProfile), {
      durationMs: FOCUS_TRANSITION_MS,
    });
    setFocusedOrganismId(null);
    setPendingFocusAfterSwitch(null);
  }, [altitudeZoomProfile, animateTo, loading, pendingFocusAfterSwitch]);

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
            boundaryOrganismId: currentBoundaryOrganismId,
          },
        ]);
        setCurrentMapId(targetMapId);
        setCurrentBoundaryOrganismId(from.organismId);
        setEnteredOrganismId(null);
        setFocusedOrganismId(null);
        setHoveredOrganismId(null);
        setCursorWorld(null);
        setPendingFocusAfterSwitch(null);
      });
    },
    [animateTo, currentBoundaryOrganismId, currentMapId, runExitTransition, transitionPhase],
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
          setHoveredOrganismId(null);
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
    setHoveredOrganismId(null);
    animateTo(frameOrganism(exitX, exitY, altitudeZoomProfile), {
      durationMs: INTERIOR_EXIT_TRANSITION_MS,
      onComplete: () => {
        interiorTransitioningRef.current = false;
      },
    });
  }, [altitudeZoomProfile, animateTo, transitionPhase, viewport.x, viewport.y]);

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
      setCurrentBoundaryOrganismId(previous.boundaryOrganismId);
      setFocusedOrganismId(null);
      setHoveredOrganismId(null);
      setCursorWorld(null);
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
      animateTo(frameOrganismFocus(input.x, input.y, altitudeZoomProfile), { durationMs: FOCUS_TRANSITION_MS });
    },
    [altitude, altitudeZoomProfile, animateTo, focusedOrganismId, handleEnterMap, handleEnterOrganism, transitionPhase],
  );

  const canGoBack = (enteredOrganismId !== null || mapHistory.length > 0) && transitionPhase === 'idle';
  const boundaryPath = useMemo(() => {
    const ancestorPath = mapHistory
      .map((entry) => entry.boundaryOrganismId)
      .filter((organismId): organismId is string => typeof organismId === 'string' && organismId.length > 0);

    if (!currentBoundaryOrganismId) {
      return ancestorPath;
    }

    return [...ancestorPath, currentBoundaryOrganismId];
  }, [currentBoundaryOrganismId, mapHistory]);
  const surfaceSelection = useMemo(() => {
    const selectedIds = [focusedOrganismId, enteredOrganismId].filter(
      (organismId): organismId is string => typeof organismId === 'string' && organismId.length > 0,
    );

    return Array.from(new Set(selectedIds));
  }, [enteredOrganismId, focusedOrganismId]);

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
    const handleAltitudeControl = (direction: 'in' | 'out') => {
      if (transitionPhase !== 'idle' || interiorTransitioningRef.current) {
        return;
      }

      if (altitudeDelayTimerRef.current !== null) {
        return;
      }

      const next = nextAltitude(altitude, direction);
      if (!next) {
        return;
      }

      setGroundPlaneRecalibrationEpoch((previous) => previous + 1);
      altitudeDelayTimerRef.current = window.setTimeout(() => {
        changeAltitude(direction);
        altitudeDelayTimerRef.current = null;
      }, ALTITUDE_RECALIBRATION_LEAD_MS);
    };

    onAltitudeControlReady(handleAltitudeControl);
    return () => onAltitudeControlReady(null);
  }, [altitude, changeAltitude, onAltitudeControlReady, transitionPhase]);

  useEffect(() => {
    onBackControlReady(canGoBack ? handleGoBack : null);
    return () => onBackControlReady(null);
  }, [canGoBack, handleGoBack, onBackControlReady]);

  useEffect(() => {
    onInteriorChange(enteredOrganismId !== null);
  }, [enteredOrganismId, onInteriorChange]);

  useEffect(() => {
    onEnteredOrganismChange(enteredOrganismId);
  }, [enteredOrganismId, onEnteredOrganismChange]);

  useEffect(() => {
    onBoundaryOrganismChange(currentBoundaryOrganismId);
  }, [currentBoundaryOrganismId, onBoundaryOrganismChange]);

  useEffect(() => {
    onSpatialContextChange({
      mapOrganismId: currentMapId,
      focusedOrganismId,
      cursorWorld,
      hoveredEntry,
      focusedEntry,
      viewport: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
        altitude,
      },
      surfaceSelection,
      boundaryPath,
    });
  }, [
    altitude,
    boundaryPath,
    cursorWorld,
    currentMapId,
    focusedOrganismId,
    focusedEntry,
    hoveredEntry,
    onSpatialContextChange,
    surfaceSelection,
    viewport.x,
    viewport.y,
    viewport.zoom,
  ]);

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
      <MapViewport
        viewport={viewport}
        screenSize={screenSize}
        onViewportChange={setViewport}
        onPointerWorldMove={setCursorWorld}
      >
        <GroundPlane
          width={width}
          height={height}
          altitude={altitude}
          recalibrationEpoch={groundPlaneRecalibrationEpoch}
          mapZoomScale={mapZoomScale}
        />
        <SpaceOrganismLayer
          entries={entries}
          mapWidth={width}
          mapHeight={height}
          altitude={altitude}
          zoom={viewport.zoom}
          altitudeZoomProfile={altitudeZoomProfile}
          entryOrganismsById={entryOrganismsById}
          focusedOrganismId={focusedOrganismId}
          onHoverOrganismChange={setHoveredOrganismId}
          onActivateMarker={handleActivateMarker}
        />
      </MapViewport>

      {enteredOrganismId ? <OrganismInterior organismId={enteredOrganismId} /> : null}

      <div
        className={`space-transition-overlay space-transition-overlay--${transitionPhase}`}
        style={{ opacity: transitionOpacity }}
        aria-hidden
      />
    </main>
  );
}
