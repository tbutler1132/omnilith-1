/**
 * Space organism layer for web-next.
 *
 * Renders map entries as lightweight organism markers directly in world
 * coordinates and enables entering routed organisms in-space.
 */

import type { CSSProperties } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import { MarkerPreview } from './marker-preview.js';
import type { EntryOrganismMetadata } from './use-entry-organisms.js';
import type { SpatialMapEntry } from './use-spatial-map.js';

interface SpaceOrganismLayerProps {
  readonly entries: ReadonlyArray<SpatialMapEntry>;
  readonly altitude: Altitude;
  readonly entryOrganismsById: Readonly<Record<string, EntryOrganismMetadata>>;
  readonly focusedOrganismId: string | null;
  readonly onActivateMarker: (input: {
    organismId: string;
    enterTargetMapId: string | null;
    contentTypeId: string | null;
    x: number;
    y: number;
  }) => void;
}

const BASE_MARKER_SIZE = 16;
const BASE_MARKER_FRAME_SIZE = 160;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatLabel(organismId: string): string {
  if (organismId.length <= 18) {
    return organismId;
  }

  return `${organismId.slice(0, 8)}...${organismId.slice(-4)}`;
}

export function SpaceOrganismLayer({
  entries,
  altitude,
  entryOrganismsById,
  focusedOrganismId,
  onActivateMarker,
}: SpaceOrganismLayerProps) {
  return (
    <section className="space-organism-layer" aria-label="Map organisms">
      {entries.map((entry) => {
        const markerData = entryOrganismsById[entry.organismId];
        const enterTargetMapId = markerData?.enterTargetMapId ?? null;
        const contentTypeId = markerData?.contentTypeId ?? null;
        const currentPayload = markerData?.currentPayload ?? null;
        const markerName = markerData?.name ?? formatLabel(entry.organismId);
        const isEnterable = Boolean(enterTargetMapId || contentTypeId);
        const isFocused = focusedOrganismId === entry.organismId;
        const sizeMultiplier = clamp(entry.size ?? 1, 0.6, 2.4);
        const emphasis = clamp(entry.emphasis ?? 0.72, 0, 1);
        const dotSize = BASE_MARKER_SIZE * sizeMultiplier;
        const frameSize = BASE_MARKER_FRAME_SIZE * sizeMultiplier;
        const markerStyle: CSSProperties = {
          left: entry.x,
          top: entry.y,
          width: frameSize,
          height: frameSize,
          opacity: 0.45 + emphasis * 0.55,
        };

        return (
          <button
            key={entry.organismId}
            type="button"
            className={`space-organism-marker ${isEnterable ? 'space-organism-marker--enterable' : ''} ${
              isFocused ? 'space-organism-marker--focused' : ''
            }`}
            style={markerStyle}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onActivateMarker({
                organismId: entry.organismId,
                enterTargetMapId,
                contentTypeId,
                x: entry.x,
                y: entry.y,
              });
            }}
            aria-label={isEnterable ? `Enter ${markerName}` : markerName}
            title={isEnterable ? `${markerName} (enter)` : markerName}
          >
            {altitude === 'high' ? (
              <span className="space-organism-dot" style={{ width: dotSize, height: dotSize }} />
            ) : null}

            {altitude === 'mid' ? (
              <span className="space-organism-mid">
                <span className="space-organism-type-badge">{contentTypeId ?? 'unknown'}</span>
                <span className="space-organism-name">{markerName}</span>
              </span>
            ) : null}

            {altitude === 'close' ? (
              <span className="space-organism-close">
                <span className="space-organism-type-badge">{contentTypeId ?? 'unknown'}</span>
                <span className="space-organism-name">{markerName}</span>
                <span className="space-organism-preview">
                  <MarkerPreview contentTypeId={contentTypeId} payload={currentPayload} />
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
