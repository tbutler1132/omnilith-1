/**
 * validateSpatialMap — validate spatial-map state payloads.
 *
 * Guards state appends and proposals by rejecting malformed spatial-map
 * payloads before they can enter state history.
 */

import type { ValidationContext, ValidationResult } from '@omnilith/kernel';
import type { SpatialMapPayload } from './schema.js';

const DEFAULT_MIN_SEPARATION = 48;

interface SpatialMapEntryLike {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly emphasis?: number;
}

function isEntryLike(value: unknown): value is SpatialMapEntryLike {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.organismId === 'string' &&
    typeof entry.x === 'number' &&
    typeof entry.y === 'number' &&
    (entry.size === undefined || typeof entry.size === 'number') &&
    (entry.emphasis === undefined || typeof entry.emphasis === 'number')
  );
}

function readEntriesFromPayload(payload: unknown): SpatialMapEntryLike[] {
  if (!payload || typeof payload !== 'object') return [];
  const maybeEntries = (payload as Record<string, unknown>).entries;
  if (!Array.isArray(maybeEntries)) return [];
  return maybeEntries.filter(isEntryLike);
}

function sameEntry(a: SpatialMapEntryLike, b: SpatialMapEntryLike): boolean {
  return a.x === b.x && a.y === b.y && a.size === b.size && a.emphasis === b.emphasis;
}

export function validateSpatialMap(payload: unknown, context?: ValidationContext): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<SpatialMapPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (!Array.isArray(p.entries)) {
    issues.push('entries must be an array');
  } else {
    const seen = new Set<string>();
    for (let i = 0; i < p.entries.length; i++) {
      const entry = p.entries[i];
      if (!entry || typeof entry !== 'object') {
        issues.push(`entries[${i}] must be an object`);
        continue;
      }
      if (typeof entry.organismId !== 'string' || entry.organismId.length === 0) {
        issues.push(`entries[${i}].organismId must be a non-empty string`);
      }
      if (typeof entry.x !== 'number') {
        issues.push(`entries[${i}].x must be a number`);
      }
      if (typeof entry.y !== 'number') {
        issues.push(`entries[${i}].y must be a number`);
      }
      if (entry.size !== undefined && (typeof entry.size !== 'number' || entry.size <= 0)) {
        issues.push(`entries[${i}].size must be a positive number when provided`);
      }
      if (
        entry.emphasis !== undefined &&
        (typeof entry.emphasis !== 'number' || entry.emphasis < 0 || entry.emphasis > 1)
      ) {
        issues.push(`entries[${i}].emphasis must be a number between 0 and 1 when provided`);
      }
      if (entry.organismId && seen.has(entry.organismId)) {
        issues.push(`entries[${i}].organismId is a duplicate: ${entry.organismId}`);
      }
      if (entry.organismId) {
        seen.add(entry.organismId);
      }

      if (typeof p.width === 'number' && typeof entry.x === 'number' && (entry.x < 0 || entry.x > p.width)) {
        issues.push(`entries[${i}].x must be between 0 and width`);
      }
      if (typeof p.height === 'number' && typeof entry.y === 'number' && (entry.y < 0 || entry.y > p.height)) {
        issues.push(`entries[${i}].y must be between 0 and height`);
      }
    }

    const minSeparation =
      typeof p.minSeparation === 'number' && Number.isFinite(p.minSeparation)
        ? Math.max(0, p.minSeparation)
        : DEFAULT_MIN_SEPARATION;
    for (let i = 0; i < p.entries.length; i++) {
      const a = p.entries[i];
      if (!isEntryLike(a)) continue;
      for (let j = i + 1; j < p.entries.length; j++) {
        const b = p.entries[j];
        if (!isEntryLike(b)) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const required = minSeparation * Math.max(a.size ?? 1, b.size ?? 1);
        if (distance < required) {
          issues.push(`entries[${i}] overlaps entries[${j}]`);
        }
      }
    }

    // Transition guard: appends/proposals must preserve existing entries unless explicitly handled elsewhere.
    const previousEntries = readEntriesFromPayload(context?.previousPayload);
    if (previousEntries.length > 0) {
      const nextById = new Map<string, SpatialMapEntryLike>();
      for (const entry of p.entries) {
        if (isEntryLike(entry)) {
          nextById.set(entry.organismId, entry);
        }
      }

      for (const prev of previousEntries) {
        const next = nextById.get(prev.organismId);
        if (!next) {
          issues.push(`existing entry removed: ${prev.organismId}`);
          continue;
        }
        if (!sameEntry(prev, next)) {
          issues.push(`existing entry modified: ${prev.organismId}`);
        }
      }
    }
  }

  if (typeof p.width !== 'number' || p.width <= 0) {
    issues.push('width must be a positive number');
  }

  if (typeof p.height !== 'number' || p.height <= 0) {
    issues.push('height must be a positive number');
  }

  if (p.minSeparation !== undefined && (typeof p.minSeparation !== 'number' || p.minSeparation < 0)) {
    issues.push('minSeparation must be a non-negative number when provided');
  }

  return { valid: issues.length === 0, issues };
}
