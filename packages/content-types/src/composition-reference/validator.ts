import type { ValidationResult } from '@omnilith/kernel';
import type { CompositionReferencePayload } from './schema.js';

const VALID_ARRANGEMENTS: ReadonlySet<string> = new Set([
  'sequential', 'unordered', 'grouped',
]);

export function validateCompositionReference(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<CompositionReferencePayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (!Array.isArray(p.entries)) {
    issues.push('entries must be an array');
  } else {
    for (let i = 0; i < p.entries.length; i++) {
      const entry = p.entries[i];
      if (!entry || typeof entry !== 'object') {
        issues.push(`entries[${i}] must be an object`);
        continue;
      }
      if (typeof entry.organismId !== 'string' || entry.organismId.length === 0) {
        issues.push(`entries[${i}].organismId must be a non-empty string`);
      }
      if (typeof entry.position !== 'number' || entry.position < 0) {
        issues.push(`entries[${i}].position must be a non-negative number`);
      }
    }
  }

  if (typeof p.arrangementType !== 'string' || !VALID_ARRANGEMENTS.has(p.arrangementType)) {
    issues.push(`arrangementType must be one of: ${[...VALID_ARRANGEMENTS].join(', ')}`);
  }

  return { valid: issues.length === 0, issues };
}
