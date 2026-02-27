/**
 * Threshold surface placement resolver.
 *
 * Places newly thresholded organisms near the steward's existing surfaced
 * footprint when available, otherwise near map center. Placement uses a
 * deterministic spiral search so retries remain stable and testable.
 */

import type { SpatialMapPayloadSnapshot } from './spatial-map-payload.js';

interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export interface ResolveThresholdSurfacePlacementInput {
  readonly mapPayload: SpatialMapPayloadSnapshot;
  readonly stewardEntries: ReadonlyArray<Coordinate>;
}

export interface ResolveThresholdSurfacePlacementResult {
  readonly x: number;
  readonly y: number;
  readonly source: 'steward-centroid' | 'map-center';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function distance(a: Coordinate, b: Coordinate): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isPositionAvailable(
  candidate: Coordinate,
  occupied: ReadonlyArray<Coordinate>,
  minSeparation: number,
): boolean {
  for (const entry of occupied) {
    if (distance(candidate, entry) < minSeparation) {
      return false;
    }
  }
  return true;
}

function* spiralCandidates(origin: Coordinate, step: number): Generator<Coordinate> {
  const normalizedStep = Math.max(1, step);
  yield origin;

  for (let layer = 1; ; layer += 1) {
    const radius = layer * normalizedStep;
    const minX = origin.x - radius;
    const maxX = origin.x + radius;
    const minY = origin.y - radius;
    const maxY = origin.y + radius;

    for (let x = minX; x <= maxX; x += normalizedStep) {
      yield { x, y: minY };
    }
    for (let y = minY + normalizedStep; y <= maxY; y += normalizedStep) {
      yield { x: maxX, y };
    }
    for (let x = maxX - normalizedStep; x >= minX; x -= normalizedStep) {
      yield { x, y: maxY };
    }
    for (let y = maxY - normalizedStep; y > minY; y -= normalizedStep) {
      yield { x: minX, y };
    }
  }
}

function computeOrigin(input: ResolveThresholdSurfacePlacementInput): ResolveThresholdSurfacePlacementResult {
  const width = Math.max(1, Math.round(input.mapPayload.width));
  const height = Math.max(1, Math.round(input.mapPayload.height));

  if (input.stewardEntries.length === 0) {
    return {
      x: Math.floor(width / 2),
      y: Math.floor(height / 2),
      source: 'map-center',
    };
  }

  const sum = input.stewardEntries.reduce(
    (acc, entry) => ({
      x: acc.x + entry.x,
      y: acc.y + entry.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: clamp(Math.round(sum.x / input.stewardEntries.length), 0, width - 1),
    y: clamp(Math.round(sum.y / input.stewardEntries.length), 0, height - 1),
    source: 'steward-centroid',
  };
}

export function resolveThresholdSurfacePlacement(
  input: ResolveThresholdSurfacePlacementInput,
): ResolveThresholdSurfacePlacementResult {
  const width = Math.max(1, Math.round(input.mapPayload.width));
  const height = Math.max(1, Math.round(input.mapPayload.height));
  const minSeparation = Math.max(0, Math.round(input.mapPayload.minSeparation ?? 1));
  const placementStep = Math.max(minSeparation, 24);

  const occupied: Coordinate[] = input.mapPayload.entries.map((entry) => ({
    x: Math.round(entry.x),
    y: Math.round(entry.y),
  }));

  const origin = computeOrigin(input);

  for (const candidate of spiralCandidates(origin, placementStep)) {
    if (candidate.x < 0 || candidate.x >= width || candidate.y < 0 || candidate.y >= height) {
      continue;
    }

    if (isPositionAvailable(candidate, occupied, minSeparation)) {
      return {
        x: candidate.x,
        y: candidate.y,
        source: origin.source,
      };
    }
  }

  throw new Error('No available surface coordinate on target map.');
}
