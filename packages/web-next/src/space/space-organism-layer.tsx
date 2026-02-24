/**
 * Space organism layer for web-next.
 *
 * Renders map entries as lightweight organism markers directly in world
 * coordinates and enables entering routed organisms in-space.
 */

import type { CSSProperties } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import { MarkerPreview } from './marker-preview.js';
import { resolveMarkerSizePolicy } from './marker-size-policy.js';
import { resolveMarkerVariant } from './marker-variant.js';
import type { EntryOrganismMetadata } from './use-entry-organisms.js';
import type { SpatialMapEntry } from './use-spatial-map.js';

interface SpaceOrganismLayerProps {
  readonly entries: ReadonlyArray<SpatialMapEntry>;
  readonly altitude: Altitude;
  readonly zoom: number;
  readonly entryOrganismsById: Readonly<Record<string, EntryOrganismMetadata>>;
  readonly focusedOrganismId: string | null;
  readonly onHoverOrganismChange: (organismId: string | null) => void;
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
const HALO_OPACITY_CSS_VARIABLE = '--space-marker-tiny-halo-opacity';

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
  zoom,
  entryOrganismsById,
  focusedOrganismId,
  onHoverOrganismChange,
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
        const markerVariant = resolveMarkerVariant({
          name: markerName,
          contentTypeId,
        });
        const sizePolicy = resolveMarkerSizePolicy({
          entrySize: entry.size,
          zoom,
          altitude,
        });
        const sizeMultiplier = sizePolicy.coreSizeMultiplier;
        const emphasis = clamp(entry.emphasis ?? 0.72, 0, 1);
        const showDetailCard = sizePolicy.showDetailCard;
        const dotSize = BASE_MARKER_SIZE * sizeMultiplier;
        const frameSize = BASE_MARKER_FRAME_SIZE * sizePolicy.interactionSizeMultiplier;
        const markerStyle: CSSProperties = {
          left: entry.x,
          top: entry.y,
          width: frameSize,
          height: frameSize,
          opacity: 0.45 + emphasis * 0.55,
        };
        if (sizePolicy.haloVisible) {
          (markerStyle as Record<string, string | number | undefined>)[HALO_OPACITY_CSS_VARIABLE] = String(
            sizePolicy.haloStrength,
          );
        }

        return (
          <button
            key={entry.organismId}
            type="button"
            className={[
              'space-organism-marker',
              markerVariant !== 'default' ? `space-organism-marker--${markerVariant}` : null,
              sizePolicy.haloVisible ? 'space-organism-marker--tiny' : null,
              isEnterable ? 'space-organism-marker--enterable' : null,
              isFocused ? 'space-organism-marker--focused' : null,
            ]
              .filter(Boolean)
              .join(' ')}
            style={markerStyle}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerEnter={() => onHoverOrganismChange(entry.organismId)}
            onPointerLeave={() => onHoverOrganismChange(null)}
            onFocus={() => onHoverOrganismChange(entry.organismId)}
            onBlur={() => onHoverOrganismChange(null)}
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

            {altitude === 'mid' && showDetailCard ? (
              <span className="space-organism-mid">
                <span className="space-organism-type-badge">{contentTypeId ?? 'unknown'}</span>
                <span className="space-organism-name">{markerName}</span>
              </span>
            ) : null}

            {altitude === 'close' && showDetailCard ? (
              <span className="space-organism-close">
                <span className="space-organism-type-badge">{contentTypeId ?? 'unknown'}</span>
                <span className="space-organism-name">{markerName}</span>
                <span className="space-organism-preview">
                  <MarkerPreview contentTypeId={contentTypeId} payload={currentPayload} />
                </span>
              </span>
            ) : null}

            {(altitude === 'mid' || altitude === 'close') && !showDetailCard ? (
              <span className="space-organism-dot" style={{ width: dotSize, height: dotSize }} />
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
