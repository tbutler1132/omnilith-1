/**
 * validateHeroJourneyStage — validate hero-journey-stage state payloads.
 *
 * Guards state appends and proposals by rejecting malformed hero-journey-stage
 * payloads before they can enter state history.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { HeroJourneyStagePayload } from './schema.js';

export function validateHeroJourneyStage(payload: unknown): ValidationResult {
  const p = payload as Partial<HeroJourneyStagePayload>;
  const issues: string[] = [];

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.stageId !== 'string' || p.stageId.trim().length === 0) {
    issues.push('stageId must be a non-empty string');
  }

  if (typeof p.phase !== 'string' || p.phase.trim().length === 0) {
    issues.push('phase must be a non-empty string');
  }

  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    issues.push('title must be a non-empty string');
  }

  if (typeof p.summary !== 'string' || p.summary.trim().length === 0) {
    issues.push('summary must be a non-empty string');
  }

  if (p.accentColor !== undefined && typeof p.accentColor !== 'string') {
    issues.push('accentColor must be a string when provided');
  }

  return { valid: issues.length === 0, issues };
}
