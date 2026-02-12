import type { ValidationResult } from '@omnilith/kernel';
import type { AudioPayload } from './schema.js';
import { AUDIO_FORMATS } from './schema.js';

export function validateAudio(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<AudioPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.fileReference !== 'string' || p.fileReference.length === 0) {
    issues.push('fileReference must be a non-empty string');
  }

  if (typeof p.durationSeconds !== 'number' || p.durationSeconds <= 0) {
    issues.push('durationSeconds must be a positive number');
  }

  if (typeof p.format !== 'string' || !AUDIO_FORMATS.has(p.format)) {
    issues.push(`format must be one of: ${[...AUDIO_FORMATS].join(', ')}`);
  }

  if (p.sampleRate !== undefined && (typeof p.sampleRate !== 'number' || p.sampleRate <= 0)) {
    issues.push('sampleRate must be a positive number');
  }

  return { valid: issues.length === 0, issues };
}
