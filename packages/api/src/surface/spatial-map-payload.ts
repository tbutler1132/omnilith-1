/**
 * Spatial-map payload parser for API surfacing flows.
 *
 * Keeps map payload shape handling in one place so route handlers and
 * operational scripts can read/write entries consistently.
 */

import type { OrganismId } from '@omnilith/kernel';

export interface SpatialMapEntrySnapshot {
  readonly organismId: OrganismId;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly emphasis?: number;
}

export interface SpatialMapPayloadSnapshot {
  readonly entries: ReadonlyArray<SpatialMapEntrySnapshot>;
  readonly width: number;
  readonly height: number;
  readonly minSeparation?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseSpatialMapPayload(payload: unknown): SpatialMapPayloadSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Record<string, unknown>;
  const width = candidate.width;
  const height = candidate.height;
  const entries = candidate.entries;
  const minSeparation = candidate.minSeparation;

  if (!isFiniteNumber(width) || !isFiniteNumber(height) || !Array.isArray(entries)) {
    return null;
  }

  const parsedEntries: SpatialMapEntrySnapshot[] = [];
  for (const value of entries) {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    if (typeof entry.organismId !== 'string' || !isFiniteNumber(entry.x) || !isFiniteNumber(entry.y)) {
      return null;
    }
    if (entry.size !== undefined && !isFiniteNumber(entry.size)) {
      return null;
    }
    if (entry.emphasis !== undefined && !isFiniteNumber(entry.emphasis)) {
      return null;
    }

    parsedEntries.push({
      organismId: entry.organismId as OrganismId,
      x: entry.x,
      y: entry.y,
      size: entry.size as number | undefined,
      emphasis: entry.emphasis as number | undefined,
    });
  }

  if (minSeparation !== undefined && !isFiniteNumber(minSeparation)) {
    return null;
  }

  return {
    entries: parsedEntries,
    width,
    height,
    minSeparation: minSeparation as number | undefined,
  };
}
