/**
 * Space organism layer for web-next.
 *
 * Renders map entries as lightweight organism markers directly in world
 * coordinates. Markers are currently read-only visual anchors.
 */

import type { CSSProperties } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import type { SpatialMapEntry } from './use-spatial-map.js';

interface SpaceOrganismLayerProps {
  readonly entries: ReadonlyArray<SpatialMapEntry>;
  readonly altitude: Altitude;
}

const BASE_MARKER_SIZE = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatLabel(organismId: string): string {
  if (organismId.length <= 18) {
    return organismId;
  }

  return `${organismId.slice(0, 8)}...${organismId.slice(-4)}`;
}

export function SpaceOrganismLayer({ entries, altitude }: SpaceOrganismLayerProps) {
  const showLabels = altitude !== 'high';

  return (
    <div className="space-organism-layer" aria-hidden="true">
      {entries.map((entry) => {
        const sizeMultiplier = clamp(entry.size ?? 1, 0.6, 2.4);
        const emphasis = clamp(entry.emphasis ?? 0.72, 0, 1);
        const dotSize = BASE_MARKER_SIZE * sizeMultiplier;
        const markerStyle: CSSProperties = {
          left: entry.x,
          top: entry.y,
          opacity: 0.45 + emphasis * 0.55,
        };

        return (
          <div key={entry.organismId} className="space-organism-marker" style={markerStyle}>
            <span className="space-organism-dot" style={{ width: dotSize, height: dotSize }} />
            {showLabels ? <span className="space-organism-label">{formatLabel(entry.organismId)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
