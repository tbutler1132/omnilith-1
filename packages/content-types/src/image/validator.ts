import type { ValidationResult } from '@omnilith/kernel';
import type { ImagePayload } from './schema.js';
import { IMAGE_FORMATS } from './schema.js';

export function validateImage(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<ImagePayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.fileReference !== 'string' || p.fileReference.length === 0) {
    issues.push('fileReference must be a non-empty string');
  }

  if (typeof p.width !== 'number' || p.width <= 0) {
    issues.push('width must be a positive number');
  }

  if (typeof p.height !== 'number' || p.height <= 0) {
    issues.push('height must be a positive number');
  }

  if (typeof p.format !== 'string' || !IMAGE_FORMATS.has(p.format)) {
    issues.push(`format must be one of: ${[...IMAGE_FORMATS].join(', ')}`);
  }

  return { valid: issues.length === 0, issues };
}
