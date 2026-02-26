/**
 * Marker size policy for world-map readability and size truth.
 *
 * Applies a zoom-aware visibility boost on world map overviews, then
 * converges to exact proportional sizing by close altitude entry.
 */

import type { Altitude } from '../contracts/altitude.js';
import { ORGANISM_SIZE_RENDER_CONTRACT } from './organism-size-render-contract.js';
import { type AltitudeZoomProfile, zoomForAltitude } from './viewport-math.js';

const MIN_SIZE_MULTIPLIER = ORGANISM_SIZE_RENDER_CONTRACT.minPositiveSize;
const WORLD_MAP_BOOST_EXPONENT = ORGANISM_SIZE_RENDER_CONTRACT.worldMapBoostExponent;
const WORLD_MAP_BOOST_MIN = ORGANISM_SIZE_RENDER_CONTRACT.worldMapBoostMin;
const WORLD_MAP_BOOST_MAX = ORGANISM_SIZE_RENDER_CONTRACT.worldMapBoostMax;
const WORLD_MAP_INTERACTION_MIN = ORGANISM_SIZE_RENDER_CONTRACT.interactionSizeMin;
const WORLD_MAP_DETAIL_CARD_MIN = ORGANISM_SIZE_RENDER_CONTRACT.detailCardSizeMin;
const WORLD_MAP_HALO_THRESHOLD = ORGANISM_SIZE_RENDER_CONTRACT.haloThreshold;
const WORLD_MAP_HALO_MIN = ORGANISM_SIZE_RENDER_CONTRACT.haloStrengthMin;
const WORLD_MAP_HALO_MAX = ORGANISM_SIZE_RENDER_CONTRACT.haloStrengthMax;

export interface MarkerSizePolicyInput {
  readonly entrySize: number | undefined;
  readonly zoom: number;
  readonly altitude: Altitude;
  readonly zoomProfile?: AltitudeZoomProfile;
  readonly normalizationContext?: MarkerNormalizationContext;
}

export interface MarkerNormalizationContext {
  readonly qLow: number;
  readonly qHigh: number;
  readonly median: number;
  readonly count: number;
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

function resolveWorldMapBlend(zoom: number, altitude: Altitude, zoomProfile?: AltitudeZoomProfile): number {
  if (altitude === 'close') {
    return 1;
  }

  const midZoom = zoomForAltitude('mid', zoomProfile);
  const closeZoom = zoomForAltitude('close', zoomProfile);
  const closeEntryZoom = (midZoom + closeZoom) / 2;
  const normalized = (zoom - midZoom) / (closeEntryZoom - midZoom);
  return smoothstep(normalized);
}

function resolveWorldMapBoostedSize(sizeMultiplier: number): number {
  const boosted = sizeMultiplier ** WORLD_MAP_BOOST_EXPONENT;
  return clamp(boosted, WORLD_MAP_BOOST_MIN, WORLD_MAP_BOOST_MAX);
}

function resolveNormalizationStrength(altitude: Altitude): number {
  if (altitude === 'high') {
    return 0.58;
  }

  if (altitude === 'mid') {
    return 0.34;
  }

  return 0.12;
}

function resolveReadableSizeMultiplier(
  proportionalSizeMultiplier: number,
  altitude: Altitude,
  normalizationContext?: MarkerNormalizationContext,
): number {
  if (!normalizationContext || normalizationContext.count < 3) {
    return resolveWorldMapBoostedSize(proportionalSizeMultiplier);
  }

  const strength = resolveNormalizationStrength(altitude);
  const qLow = Math.max(MIN_SIZE_MULTIPLIER, normalizationContext.qLow);
  const qHigh = Math.max(qLow, normalizationContext.qHigh);
  const median = Math.max(MIN_SIZE_MULTIPLIER, normalizationContext.median);
  const winsorized = clamp(proportionalSizeMultiplier, qLow, qHigh);
  const logDelta = Math.log(winsorized / median);
  const compressionFactor = 1 - 0.56 * strength;
  const compressed = median * Math.exp(logDelta * compressionFactor);
  const blended = lerp(proportionalSizeMultiplier, compressed, strength);
  return clamp(blended, WORLD_MAP_BOOST_MIN, WORLD_MAP_BOOST_MAX);
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

  const boostedSizeMultiplier = resolveReadableSizeMultiplier(
    proportionalSizeMultiplier,
    input.altitude,
    input.normalizationContext,
  );
  const blend = resolveWorldMapBlend(input.zoom, input.altitude, input.zoomProfile);
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
