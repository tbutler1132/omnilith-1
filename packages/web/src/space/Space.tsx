/**
 * Space — the 2D zoomable canvas where organisms are experienced.
 *
 * Orchestrates the spatial-map data, viewport state with discrete
 * altitude levels, and rendering layers. Manages transitions between
 * map exploration and organism interiors via a phase state machine:
 * map → entering → inside → exiting → map.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  usePlatformActions,
  usePlatformMapState,
  usePlatformViewportMeta,
  usePlatformVisorState,
} from '../platform/index.js';
import { AltitudeControls } from './AltitudeControls.js';
import { Compass } from './Compass.js';
import { GroundPlane } from './GroundPlane.js';
import { OrganismInterior } from './OrganismInterior.js';
import { SpaceLayer } from './SpaceLayer.js';
import { SpaceViewport } from './SpaceViewport.js';
import { useSpatialMap } from './use-spatial-map.js';
import { useViewport } from './use-viewport.js';
import { frameOrganism, frameOrganismEnter, zoomForAltitude } from './viewport-math.js';

type Phase = 'map' | 'entering' | 'inside' | 'exiting';

export function Space() {
  const { currentMapId, focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { visorOpen } = usePlatformVisorState();
  const { mapRefreshKey } = usePlatformViewportMeta();
  const { focusOrganism, enterMap, enterOrganism, exitOrganism, setAltitude, setViewportCenter } = usePlatformActions();
  const { entries, width, height, loading, error } = useSpatialMap(currentMapId, mapRefreshKey);
  const { viewport, screenSize, altitude, containerRef, setViewport, animateTo, changeAltitude } = useViewport({
    mapWidth: width,
    mapHeight: height,
  });

  // ── Transition state machine ──
  const [phase, setPhase] = useState<Phase>('map');
  const [interiorOpacity, setInteriorOpacity] = useState(0);
  const [interiorOrganismId, setInteriorOrganismId] = useState<string | null>(null);
  const fadeRef = useRef<number | null>(null);

  const cancelFade = useCallback(() => {
    if (fadeRef.current !== null) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  // Clean up fade on unmount
  useEffect(() => cancelFade, [cancelFade]);

  // ── Focus flow (first click: center at Close altitude) ──
  const handleFocusOrganism = useCallback(
    (organismId: string, wx: number, wy: number) => {
      if (phase !== 'map') return;
      focusOrganism(organismId);
      animateTo(frameOrganism(wx, wy));
    },
    [phase, focusOrganism, animateTo],
  );

  // ── Enter flow (second click on focused organism) ──
  const handleEnterOrganism = useCallback(
    (organismId: string, wx: number, wy: number) => {
      if (phase !== 'map') return;

      setPhase('entering');
      setInteriorOrganismId(organismId);
      setInteriorOpacity(0);
      enterOrganism(organismId);

      const duration = 700;

      // Animate viewport zoom to enter target
      animateTo(frameOrganismEnter(wx, wy), {
        duration,
        onComplete: () => setPhase('inside'),
      });

      // Crossfade interior opacity 0 → 1 with ease-in (t²)
      cancelFade();
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        setInteriorOpacity(t * t); // ease-in
        if (t < 1) {
          fadeRef.current = requestAnimationFrame(tick);
        } else {
          fadeRef.current = null;
        }
      };
      fadeRef.current = requestAnimationFrame(tick);
    },
    [phase, enterOrganism, animateTo, cancelFade],
  );

  // ── Exit flow ──
  const handleExitOrganism = useCallback(() => {
    if (phase !== 'inside') return;

    setPhase('exiting');

    // Find the organism's position on the map to land at Close altitude
    const entry = entries.find((e) => e.organismId === interiorOrganismId);
    if (entry) {
      setViewport(frameOrganism(entry.x, entry.y));
    }

    // Crossfade interior opacity 1 → 0 with ease-out (1 - (1-t)²)
    cancelFade();
    const duration = 500;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t); // ease-out
      setInteriorOpacity(1 - eased);
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        fadeRef.current = null;
        setPhase('map');
        setInteriorOrganismId(null);
        exitOrganism();
      }
    };
    fadeRef.current = requestAnimationFrame(tick);
  }, [phase, entries, interiorOrganismId, setViewport, exitOrganism, cancelFade]);

  // ── React to external exit requests (e.g. HudBar back button) ──
  // When enteredOrganismId is cleared externally while Space is still
  // in the 'inside' phase, trigger the proper exit animation.
  useEffect(() => {
    if (!enteredOrganismId && phase === 'inside') {
      handleExitOrganism();
    }
  }, [enteredOrganismId, phase, handleExitOrganism]);

  // ── Respond to focus changes (map phase only) ──
  // When focus clears: zoom out to High.
  // When focus is set externally (e.g. Visit from Visor): animate to organism position.
  const prevFocusRef = useRef(focusedOrganismId);
  useEffect(() => {
    const prev = prevFocusRef.current;
    prevFocusRef.current = focusedOrganismId;

    if (phase !== 'map') return;

    if (prev && !focusedOrganismId) {
      animateTo({ x: width / 2, y: height / 2, zoom: zoomForAltitude('high') });
    } else if (!prev && focusedOrganismId) {
      const entry = entries.find((e) => e.organismId === focusedOrganismId);
      if (entry) {
        animateTo(frameOrganism(entry.x, entry.y));
      }
    }
  }, [focusedOrganismId, animateTo, width, height, phase, entries]);

  // ── Sync altitude to PlatformContext for HUD display ──
  useEffect(() => {
    setAltitude(altitude);
  }, [altitude, setAltitude]);

  // ── Sync viewport center to PlatformContext for surfacing ──
  useEffect(() => {
    setViewportCenter(viewport.x, viewport.y);
  }, [viewport.x, viewport.y, setViewportCenter]);

  // ── Escape key ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (visorOpen) return;

      if (phase === 'inside') {
        handleExitOrganism();
      } else if (phase === 'map' && focusedOrganismId) {
        focusOrganism(null);
      }
      // 'entering' / 'exiting' → ignore, let transition finish
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visorOpen, focusedOrganismId, phase, focusOrganism, handleExitOrganism]);

  if (loading) {
    return (
      <div className="space" ref={containerRef}>
        <div className="space-empty">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space" ref={containerRef}>
        <div className="space-empty">Failed to load map.</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space" ref={containerRef}>
        <div className="space-empty">
          <p>This space is empty.</p>
          <p className="space-hint">Open the visor to threshold organisms and compose them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space" ref={containerRef}>
      <SpaceViewport
        viewport={viewport}
        screenSize={screenSize}
        onViewportChange={setViewport}
        onAltitudeChange={changeAltitude}
        onClearFocus={() => focusOrganism(null)}
        disabled={phase !== 'map'}
      >
        <GroundPlane width={width} height={height} altitude={altitude} />
        <SpaceLayer
          entries={entries}
          viewport={viewport}
          screenSize={screenSize}
          altitude={altitude}
          focusedOrganismId={focusedOrganismId}
          onFocusOrganism={handleFocusOrganism}
          onEnterOrganism={handleEnterOrganism}
          onEnterMap={enterMap}
        />
      </SpaceViewport>
      {interiorOrganismId && <OrganismInterior organismId={interiorOrganismId} opacity={interiorOpacity} />}
      <Compass />
      {phase === 'map' && <AltitudeControls altitude={altitude} onChangeAltitude={changeAltitude} />}
    </div>
  );
}
