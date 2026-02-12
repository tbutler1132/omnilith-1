import type { ValidationResult } from '@omnilith/kernel';
import type { ThreadPayload, ThreadPostPayload } from './schema.js';

export function validateThread(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<ThreadPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  // Thread creation payload
  if ('title' in p) {
    if (typeof p.title !== 'string' || p.title.length === 0) {
      issues.push('title must be a non-empty string');
    }
    if (p.appendOnly !== undefined && typeof p.appendOnly !== 'boolean') {
      issues.push('appendOnly must be a boolean');
    }
    return { valid: issues.length === 0, issues };
  }

  // Thread post payload (state append)
  const post = payload as Partial<ThreadPostPayload>;
  if ('author' in post) {
    if (typeof post.author !== 'string' || post.author.length === 0) {
      issues.push('author must be a non-empty string');
    }
    if (typeof post.content !== 'string') {
      issues.push('content must be a string');
    }
    if (typeof post.timestamp !== 'number') {
      issues.push('timestamp must be a number');
    }
    return { valid: issues.length === 0, issues };
  }

  return { valid: false, issues: ['Payload must be a thread creation or post'] };
}
