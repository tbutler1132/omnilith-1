/**
 * Space stage map surface for web-next Slice 1.
 *
 * Renders the world map grid with drag navigation plus lightweight organism
 * markers from spatial-map entries.
 */

import { useEffect } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import { GroundPlane } from './ground-plane.js';
import { MapViewport } from './map-viewport.js';
import { SpaceOrganismLayer } from './space-organism-layer.js';
import { useSpatialMap } from './use-spatial-map.js';
import { useViewport } from './use-viewport.js';

interface SpaceStageProps {
  readonly worldMapId: string;
  readonly onAltitudeChange: (altitude: Altitude) => void;
  readonly onAltitudeControlReady: (handler: ((direction: 'in' | 'out') => void) | null) => void;
}

export function SpaceStage({ worldMapId, onAltitudeChange, onAltitudeControlReady }: SpaceStageProps) {
  const { width, height, entries, entryCount, loading, error } = useSpatialMap(worldMapId);
  const { viewport, screenSize, altitude, containerRef, setViewport, changeAltitude } = useViewport({
    mapWidth: width,
    mapHeight: height,
  });

  useEffect(() => {
    onAltitudeChange(altitude);
  }, [altitude, onAltitudeChange]);

  useEffect(() => {
    onAltitudeControlReady(changeAltitude);
    return () => onAltitudeControlReady(null);
  }, [changeAltitude, onAltitudeControlReady]);

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
        <SpaceOrganismLayer entries={entries} altitude={altitude} />
      </MapViewport>

      <div className="space-map-status">
        <p>World map: {worldMapId}</p>
        <p>Entries: {entryCount}</p>
        <p>Altitude: {altitude}</p>
        <p>Drag to navigate.</p>
      </div>
    </main>
  );
}
