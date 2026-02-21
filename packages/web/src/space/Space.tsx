/**
 * Space — the 2D zoomable canvas where organisms are experienced.
 *
 * Orchestrates the spatial-map data, viewport state with discrete
 * altitude levels, and rendering layers. Manages transitions between
 * map exploration and organism interiors via a phase state machine:
 * map → entering → inside → exiting → map.
 */

import { useEffect, useRef } from 'react';
import { usePlatformActions, usePlatformMapState, usePlatformViewportMeta } from '../platform/index.js';
import { AltitudeControls } from './AltitudeControls.js';
import { SpaceAmbientLayerHost } from './ambient/SpaceAmbientLayerHost.js';
import { GroundPlane } from './GroundPlane.js';
import { OrganismInterior } from './OrganismInterior.js';
import { SpaceLayer } from './SpaceLayer.js';
import { SpaceViewport } from './SpaceViewport.js';
import { useSpacePhaseMachine } from './use-space-phase-machine.js';
import { useSpatialMap } from './use-spatial-map.js';
import { useViewport } from './use-viewport.js';
import { frameOrganism, zoomForAltitude } from './viewport-math.js';

export function Space() {
  const { currentMapId, focusedOrganismId, enteredOrganismId } = usePlatformMapState();
  const { mapRefreshKey } = usePlatformViewportMeta();
  const { focusOrganism, enterMap, enterOrganism, exitOrganism, setAltitude, setViewportCenter } = usePlatformActions();
  const { entries, width, height, loading, error } = useSpatialMap(currentMapId, mapRefreshKey);
  const { viewport, screenSize, altitude, containerRef, setViewport, animateTo, changeAltitude } = useViewport({
    mapWidth: width,
    mapHeight: height,
  });
  const { phase, interiorOpacity, interiorOrganismId, handleFocusOrganism, handleEnterOrganism, handleExitOrganism } =
    useSpacePhaseMachine({
      entries,
      enteredOrganismId,
      focusOrganism,
      enterOrganism,
      exitOrganism,
      animateTo,
      setViewport,
    });

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
      if (e.defaultPrevented) return;

      if (phase === 'inside') {
        handleExitOrganism();
      } else if (phase === 'map' && focusedOrganismId) {
        focusOrganism(null);
      }
      // 'entering' / 'exiting' → ignore, let transition finish
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedOrganismId, phase, focusOrganism, handleExitOrganism]);

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
          <p className="space-hint">Open the visor to review your profile and proposal activity.</p>
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
        <SpaceAmbientLayerHost
          context={{
            mapId: currentMapId,
            entries,
            viewport,
            screenSize,
            altitude,
            focusedOrganismId,
            enteredOrganismId,
          }}
        />
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
      {phase === 'map' && <AltitudeControls altitude={altitude} onChangeAltitude={changeAltitude} />}
    </div>
  );
}
