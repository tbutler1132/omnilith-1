/**
 * validateSong — validate song state payloads.
 *
 * Guards state appends and proposals by rejecting malformed song
 * payloads before they can enter state history.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { SongPayload } from './schema.js';
import { SONG_STATUSES } from './schema.js';

export function validateSong(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<SongPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    issues.push('title must be a non-empty string');
  }

  if (typeof p.artistCredit !== 'string' || p.artistCredit.trim().length === 0) {
    issues.push('artistCredit must be a non-empty string');
  }

  if (typeof p.status !== 'string' || !SONG_STATUSES.has(p.status)) {
    issues.push(`status must be one of: ${[...SONG_STATUSES].join(', ')}`);
  }

  if (p.tempoBpm !== undefined && (typeof p.tempoBpm !== 'number' || p.tempoBpm <= 0)) {
    issues.push('tempoBpm must be a positive number');
  }

  if (p.keySignature !== undefined && (typeof p.keySignature !== 'string' || p.keySignature.trim().length === 0)) {
    issues.push('keySignature must be a non-empty string when provided');
  }

  if (p.notes !== undefined && typeof p.notes !== 'string') {
    issues.push('notes must be a string when provided');
  }

  return { valid: issues.length === 0, issues };
}
