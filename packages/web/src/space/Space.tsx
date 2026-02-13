/**
 * Space — the 2D zoomable canvas where organisms are experienced.
 *
 * Orchestrates the spatial-map data, viewport state, and rendering
 * layers. Organisms are positioned at world coordinates from the
 * spatial-map payload and rendered via content-type renderers.
 * The FocusLens overlays an immersive view as the viewport zooms in.
 */

import { useEffect, useRef } from 'react';
import { usePlatform } from '../platform/index.js';
import { FocusLens } from './FocusLens.js';
import { SpaceLayer } from './SpaceLayer.js';
import { SpaceViewport } from './SpaceViewport.js';
import { useSpatialMap } from './use-spatial-map.js';
import { useViewport } from './use-viewport.js';

export function Space() {
  const { state, exitMap, focusOrganism } = usePlatform();
  const { entries, width, height, loading, error } = useSpatialMap(state.currentMapId);
  const { viewport, screenSize, containerRef, setViewport, animateTo } = useViewport({
    mapWidth: width,
    mapHeight: height,
  });

  const atRoot = state.navigationStack.length <= 1;

  // Zoom out to overview when focus clears
  const prevFocusRef = useRef(state.focusedOrganismId);
  useEffect(() => {
    const prev = prevFocusRef.current;
    prevFocusRef.current = state.focusedOrganismId;

    if (prev && !state.focusedOrganismId) {
      animateTo({ x: width / 2, y: height / 2, zoom: 0.5 });
    }
  }, [state.focusedOrganismId, animateTo, width, height]);

  // Escape key clears focus (unless visor is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !state.visorOpen && state.focusedOrganismId) {
        focusOrganism(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.visorOpen, state.focusedOrganismId, focusOrganism]);

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
        onExitMap={exitMap}
        atRoot={atRoot}
        onClearFocus={() => focusOrganism(null)}
      >
        <SpaceLayer entries={entries} viewport={viewport} screenSize={screenSize} animateTo={animateTo} />
      </SpaceViewport>
      <FocusLens focusedOrganismId={state.focusedOrganismId} viewport={viewport} />
    </div>
  );
}
