/**
 * Marker size policy for world-map readability and size truth.
 *
 * Applies a zoom-aware visibility boost on world map overviews, then
 * converges to exact proportional sizing by close altitude entry.
 */

import type { Altitude } from '../contracts/altitude.js';
import { zoomForAltitude } from './viewport-math.js';

const MIN_SIZE_MULTIPLIER = 0.000001;
const WORLD_MAP_BOOST_EXPONENT = 0.82;
const WORLD_MAP_BOOST_MIN = 0.08;
const WORLD_MAP_BOOST_MAX = 3.2;
const WORLD_MAP_INTERACTION_MIN = 0.28;
const WORLD_MAP_DETAIL_CARD_MIN = 0.35;
const WORLD_MAP_HALO_THRESHOLD = 0.18;
const WORLD_MAP_HALO_MIN = 0.24;
const WORLD_MAP_HALO_MAX = 0.7;

export interface MarkerSizePolicyInput {
  readonly entrySize: number | undefined;
  readonly zoom: number;
  readonly altitude: Altitude;
}

export interface MarkerSizePolicyOutput {
  readonly proportionalSizeMultiplier: number;
  readonly boostedSizeMultiplier: number;
  readonly blend: number;
  readonly coreSizeMultiplier: number;
  readonly interactionSizeMultiplier: number;
  readonly showDetailCard: boolean;
  readonly haloVisible: boolean;
  readonly haloStrength: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function normalizeSizeMultiplier(entrySize: number | undefined): number {
  if (typeof entrySize !== 'number' || !Number.isFinite(entrySize) || entrySize <= 0) {
    return 1;
  }

  return Math.max(entrySize, MIN_SIZE_MULTIPLIER);
}

function resolveWorldMapBlend(zoom: number, altitude: Altitude): number {
  if (altitude === 'close') {
    return 1;
  }

  const midZoom = zoomForAltitude('mid');
  const closeZoom = zoomForAltitude('close');
  const closeEntryZoom = (midZoom + closeZoom) / 2;
  const normalized = (zoom - midZoom) / (closeEntryZoom - midZoom);
  return smoothstep(normalized);
}

function resolveWorldMapBoostedSize(sizeMultiplier: number): number {
  const boosted = sizeMultiplier ** WORLD_MAP_BOOST_EXPONENT;
  return clamp(boosted, WORLD_MAP_BOOST_MIN, WORLD_MAP_BOOST_MAX);
}

function resolveWorldMapHaloStrength(coreSizeMultiplier: number): number {
  if (coreSizeMultiplier >= WORLD_MAP_HALO_THRESHOLD) {
    return 0;
  }

  const normalized = clamp01((WORLD_MAP_HALO_THRESHOLD - coreSizeMultiplier) / WORLD_MAP_HALO_THRESHOLD);
  return lerp(WORLD_MAP_HALO_MIN, WORLD_MAP_HALO_MAX, normalized);
}

export function resolveMarkerSizePolicy(input: MarkerSizePolicyInput): MarkerSizePolicyOutput {
  const proportionalSizeMultiplier = normalizeSizeMultiplier(input.entrySize);

  const boostedSizeMultiplier = resolveWorldMapBoostedSize(proportionalSizeMultiplier);
  const blend = resolveWorldMapBlend(input.zoom, input.altitude);
  const coreSizeMultiplier = lerp(boostedSizeMultiplier, proportionalSizeMultiplier, blend);
  const interactionSizeMultiplier = Math.max(coreSizeMultiplier, WORLD_MAP_INTERACTION_MIN);
  const haloStrength = resolveWorldMapHaloStrength(coreSizeMultiplier);
  const haloVisible = haloStrength > 0;
  const showDetailCard = input.altitude !== 'high' && coreSizeMultiplier >= WORLD_MAP_DETAIL_CARD_MIN;

  return {
    proportionalSizeMultiplier,
    boostedSizeMultiplier,
    blend,
    coreSizeMultiplier,
    interactionSizeMultiplier,
    showDetailCard,
    haloVisible,
    haloStrength,
  };
}
