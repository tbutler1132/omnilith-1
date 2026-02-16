import type { ValidationResult } from '@omnilith/kernel';
import type { CommunityPayload } from './schema.js';

export function validateCommunity(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<CommunityPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.description !== 'string' || p.description.length === 0) {
    issues.push('description must be a non-empty string');
  }

  if (typeof p.mapOrganismId !== 'string' || p.mapOrganismId.length === 0) {
    issues.push('mapOrganismId must be a non-empty string');
  }

  return { valid: issues.length === 0, issues };
}
