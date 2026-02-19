/**
 * validateHeroJourneyScene — validate hero-journey-scene state payloads.
 *
 * Guards state appends and proposals by rejecting malformed hero-journey-scene
 * payloads before they can enter state history.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { HeroJourneyChapter, HeroJourneyScenePayload } from './schema.js';

function validateChapter(chapter: HeroJourneyChapter, index: number, issues: string[]): void {
  if (chapter.stageId !== undefined && (typeof chapter.stageId !== 'string' || chapter.stageId.trim().length === 0)) {
    issues.push(`chapters[${index}].stageId must be a non-empty string when provided`);
  }
  if (typeof chapter.phase !== 'string' || chapter.phase.trim().length === 0) {
    issues.push(`chapters[${index}].phase must be a non-empty string`);
  }
  if (typeof chapter.title !== 'string' || chapter.title.trim().length === 0) {
    issues.push(`chapters[${index}].title must be a non-empty string`);
  }
  if (typeof chapter.summary !== 'string' || chapter.summary.trim().length === 0) {
    issues.push(`chapters[${index}].summary must be a non-empty string`);
  }
  if (chapter.accentColor !== undefined && typeof chapter.accentColor !== 'string') {
    issues.push(`chapters[${index}].accentColor must be a string when provided`);
  }
}

export function validateHeroJourneyScene(payload: unknown): ValidationResult {
  const p = payload as Partial<HeroJourneyScenePayload>;
  const issues: string[] = [];

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    issues.push('title must be a non-empty string');
  }

  if (p.subtitle !== undefined && typeof p.subtitle !== 'string') {
    issues.push('subtitle must be a string when provided');
  }

  if (p.chapters !== undefined && !Array.isArray(p.chapters)) {
    issues.push('chapters must be an array when provided');
  } else if (Array.isArray(p.chapters)) {
    p.chapters.forEach((chapter, index) => {
      validateChapter(chapter as HeroJourneyChapter, index, issues);
    });
  }

  return { valid: issues.length === 0, issues };
}
