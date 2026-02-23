/**
 * Space stage map surface for web-next Slice 1.
 *
 * Renders a plain world map grid with drag navigation and no organism
 * overlays, matching the requested minimal baseline.
 */

import { GroundPlane } from './ground-plane.js';
import { MapViewport } from './map-viewport.js';
import { useSpatialMap } from './use-spatial-map.js';
import { useViewport } from './use-viewport.js';

interface SpaceStageProps {
  readonly worldMapId: string;
}

export function SpaceStage({ worldMapId }: SpaceStageProps) {
  const { width, height, entryCount, loading, error } = useSpatialMap(worldMapId);
  const { viewport, screenSize, containerRef, setViewport } = useViewport({
    mapWidth: width,
    mapHeight: height,
  });

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
      </MapViewport>

      <div className="space-map-status">
        <p>World map: {worldMapId}</p>
        <p>Entries: {entryCount}</p>
        <p>Drag to navigate.</p>
      </div>
    </main>
  );
}
