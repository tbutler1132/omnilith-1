/**
 * Space organism layer for web-next.
 *
 * Renders map entries as lightweight organism markers directly in world
 * coordinates and enables entering routed organisms in-space.
 */

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import { resolveGridSpacing } from './grid-spacing.js';
import {
  HIGH_ALTITUDE_MARKER_FILL_RATIO,
  resolveHighAltitudeSecondaryCellSize,
} from './high-altitude-grid-contract.js';
import { MarkerPreview } from './marker-preview.js';
import { type MarkerNormalizationContext, resolveMarkerSizePolicy } from './marker-size-policy.js';
import { resolveMarkerVariant } from './marker-variant.js';
import { ORGANISM_SIZE_RENDER_CONTRACT } from './organism-size-render-contract.js';
import type { EntryOrganismMetadata } from './use-entry-organisms.js';
import type { SpatialMapEntry } from './use-spatial-map.js';
import type { AltitudeZoomProfile } from './viewport-math.js';

interface SpaceOrganismLayerProps {
  readonly entries: ReadonlyArray<SpatialMapEntry>;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly altitude: Altitude;
  readonly zoom: number;
  readonly altitudeZoomProfile: AltitudeZoomProfile;
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
const HIGH_ALTITUDE_FRAME_PADDING_RATIO = 1.06;
const HIGH_ALTITUDE_SHAPE_RADIUS = '999px';
const HIGH_ALTITUDE_SHAPE_TRANSFORM = 'none';
const HIGH_ALTITUDE_SHAPE_CLIP_PATH = 'none';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finitePositiveSize(size: number | undefined): number | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return null;
  }

  return size;
}

function quantile(sorted: ReadonlyArray<number>, q: number): number {
  if (sorted.length === 0) {
    return 1;
  }

  const normalizedQ = clamp(q, 0, 1);
  const position = (sorted.length - 1) * normalizedQ;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex] ?? lower;
  const t = position - lowerIndex;
  return lower + (upper - lower) * t;
}

function resolveNormalizationContext(entries: ReadonlyArray<SpatialMapEntry>): MarkerNormalizationContext | undefined {
  const sizes = entries
    .map((entry) => finitePositiveSize(entry.size))
    .filter((size): size is number => size !== null)
    .sort((a, b) => a - b);

  if (sizes.length < 3) {
    return undefined;
  }

  return {
    qLow: quantile(sizes, 0.1),
    qHigh: quantile(sizes, 0.9),
    median: quantile(sizes, 0.5),
    count: sizes.length,
  };
}

function formatLabel(organismId: string): string {
  if (organismId.length <= 18) {
    return organismId;
  }

  return `${organismId.slice(0, 8)}...${organismId.slice(-4)}`;
}

export function resolveRenderedCoreSizeMultiplier(coreSizeMultiplier: number, isFocused: boolean): number {
  if (!isFocused) {
    return coreSizeMultiplier;
  }

  return Math.max(coreSizeMultiplier, ORGANISM_SIZE_RENDER_CONTRACT.focusedCoreSizeMin);
}

export function resolveHighAltitudeCircleSize(proportionalDotSize: number, gridSpacing: number): number {
  if (!Number.isFinite(proportionalDotSize) || proportionalDotSize <= 0) {
    return BASE_MARKER_SIZE;
  }

  const normalizedGridSpacing =
    Number.isFinite(gridSpacing) && gridSpacing > 0 ? gridSpacing : Math.max(BASE_MARKER_SIZE, proportionalDotSize);
  const secondaryCellSize = resolveHighAltitudeSecondaryCellSize(normalizedGridSpacing);
  return Math.max(proportionalDotSize, secondaryCellSize * HIGH_ALTITUDE_MARKER_FILL_RATIO);
}

export function SpaceOrganismLayer({
  entries,
  mapWidth,
  mapHeight,
  altitude,
  zoom,
  altitudeZoomProfile,
  entryOrganismsById,
  focusedOrganismId,
  onHoverOrganismChange,
  onActivateMarker,
}: SpaceOrganismLayerProps) {
  const normalizationContext = useMemo(() => resolveNormalizationContext(entries), [entries]);
  const gridSpacing = useMemo(() => resolveGridSpacing(mapWidth, mapHeight), [mapHeight, mapWidth]);

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
          zoomProfile: altitudeZoomProfile,
          normalizationContext,
        });
        const sizeMultiplier = resolveRenderedCoreSizeMultiplier(sizePolicy.coreSizeMultiplier, isFocused);
        const emphasis = clamp(entry.emphasis ?? 0.72, 0, 1);
        const showDetailCard = sizePolicy.showDetailCard;
        const proportionalDotSize = BASE_MARKER_SIZE * sizeMultiplier;
        const dotSize =
          altitude === 'high' ? resolveHighAltitudeCircleSize(proportionalDotSize, gridSpacing) : proportionalDotSize;
        const proportionalFrameSize = BASE_MARKER_FRAME_SIZE * sizePolicy.interactionSizeMultiplier;
        const frameSize =
          altitude === 'high'
            ? Math.max(proportionalFrameSize, dotSize * HIGH_ALTITUDE_FRAME_PADDING_RATIO)
            : proportionalFrameSize;
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
        if (altitude === 'high') {
          (markerStyle as Record<string, string | number | undefined>)['--space-marker-shape-radius'] =
            HIGH_ALTITUDE_SHAPE_RADIUS;
          (markerStyle as Record<string, string | number | undefined>)['--space-marker-shape-transform'] =
            HIGH_ALTITUDE_SHAPE_TRANSFORM;
          (markerStyle as Record<string, string | number | undefined>)['--space-marker-shape-clip-path'] =
            HIGH_ALTITUDE_SHAPE_CLIP_PATH;
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
