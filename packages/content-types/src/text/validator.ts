import type { ValidationResult } from '@omnilith/kernel';
import type { TextPayload, TextFormat } from './schema.js';

const VALID_FORMATS: ReadonlySet<string> = new Set(['plaintext', 'markdown']);

export function validateText(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<TextPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.content !== 'string') {
    issues.push('content must be a string');
  }

  if (typeof p.format !== 'string' || !VALID_FORMATS.has(p.format)) {
    issues.push('format must be plaintext or markdown');
  }

  return { valid: issues.length === 0, issues };
}
