import type { ValidationResult } from '@omnilith/kernel';
import type { SpatialMapPayload } from './schema.js';

export function validateSpatialMap(payload: unknown): ValidationResult {
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
      if (entry.organismId && seen.has(entry.organismId)) {
        issues.push(`entries[${i}].organismId is a duplicate: ${entry.organismId}`);
      }
      if (entry.organismId) {
        seen.add(entry.organismId);
      }
    }
  }

  if (typeof p.width !== 'number' || p.width <= 0) {
    issues.push('width must be a positive number');
  }

  if (typeof p.height !== 'number' || p.height <= 0) {
    issues.push('height must be a positive number');
  }

  return { valid: issues.length === 0, issues };
}
