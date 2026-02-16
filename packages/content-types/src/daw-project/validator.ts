import type { ValidationResult } from '@omnilith/kernel';
import type { DawProjectPayload } from './schema.js';
import { DAW_NAMES, DAW_PROJECT_FORMATS } from './schema.js';

export function validateDawProject(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<DawProjectPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.fileReference !== 'string' || p.fileReference.trim().length === 0) {
    issues.push('fileReference must be a non-empty string');
  }

  if (typeof p.daw !== 'string' || !DAW_NAMES.has(p.daw)) {
    issues.push(`daw must be one of: ${[...DAW_NAMES].join(', ')}`);
  }

  if (typeof p.format !== 'string' || !DAW_PROJECT_FORMATS.has(p.format)) {
    issues.push(`format must be one of: ${[...DAW_PROJECT_FORMATS].join(', ')}`);
  }

  if (p.versionLabel !== undefined && (typeof p.versionLabel !== 'string' || p.versionLabel.trim().length === 0)) {
    issues.push('versionLabel must be a non-empty string when provided');
  }

  return { valid: issues.length === 0, issues };
}
