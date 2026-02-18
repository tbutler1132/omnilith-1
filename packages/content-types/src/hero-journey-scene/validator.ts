import type { ValidationResult } from '@omnilith/kernel';
import type { HeroJourneyChapter, HeroJourneyScenePayload } from './schema.js';

function validateChapter(chapter: HeroJourneyChapter, index: number, issues: string[]): void {
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

  if (!Array.isArray(p.chapters) || p.chapters.length === 0) {
    issues.push('chapters must be a non-empty array');
  } else {
    p.chapters.forEach((chapter, index) => {
      validateChapter(chapter as HeroJourneyChapter, index, issues);
    });
  }

  return { valid: issues.length === 0, issues };
}
