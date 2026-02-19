/**
 * validateStemsBundle — validate stems-bundle state payloads.
 *
 * Guards state appends and proposals by rejecting malformed stems-bundle
 * payloads before they can enter state history.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { StemsBundlePayload } from './schema.js';
import { STEMS_BIT_DEPTHS, STEMS_BUNDLE_FORMATS } from './schema.js';

export function validateStemsBundle(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<StemsBundlePayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.fileReference !== 'string' || p.fileReference.trim().length === 0) {
    issues.push('fileReference must be a non-empty string');
  }

  if (typeof p.format !== 'string' || !STEMS_BUNDLE_FORMATS.has(p.format)) {
    issues.push(`format must be one of: ${[...STEMS_BUNDLE_FORMATS].join(', ')}`);
  }

  if (p.stemCount !== undefined && (typeof p.stemCount !== 'number' || p.stemCount <= 0)) {
    issues.push('stemCount must be a positive number when provided');
  }

  if (p.sampleRate !== undefined && (typeof p.sampleRate !== 'number' || p.sampleRate <= 0)) {
    issues.push('sampleRate must be a positive number when provided');
  }

  if (p.bitDepth !== undefined && (typeof p.bitDepth !== 'number' || !STEMS_BIT_DEPTHS.has(p.bitDepth))) {
    issues.push(`bitDepth must be one of: ${[...STEMS_BIT_DEPTHS].join(', ')}`);
  }

  return { valid: issues.length === 0, issues };
}
