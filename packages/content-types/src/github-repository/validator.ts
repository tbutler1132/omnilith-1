/**
 * GitHub repository validator — strict validation for external twin integrity.
 *
 * Repository twins drive automation scope. Malformed owner/repository data
 * can route actions to the wrong boundary, so validation stays strict.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { GitHubRepositoryPayload } from './schema.js';

const VALID_SYNC_STATUSES = new Set(['pending', 'synced', 'failed']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidRepositoryUrl(value: unknown): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function validateGitHubRepository(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<GitHubRepositoryPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (p.provider !== 'github') {
    issues.push("provider must be 'github'");
  }

  if (!isNonEmptyString(p.owner)) {
    issues.push('owner must be a non-empty string');
  }

  if (!isNonEmptyString(p.name)) {
    issues.push('name must be a non-empty string');
  }

  if (!isNonEmptyString(p.defaultBranch)) {
    issues.push('defaultBranch must be a non-empty string');
  }

  if (!isValidRepositoryUrl(p.repositoryUrl)) {
    issues.push('repositoryUrl must be a valid http(s) URL');
  }

  if (p.installationRef !== undefined && !isNonEmptyString(p.installationRef)) {
    issues.push('installationRef must be a non-empty string when provided');
  }

  if (!p.sync || typeof p.sync !== 'object') {
    issues.push('sync must be an object');
  } else {
    if (typeof p.sync.status !== 'string' || !VALID_SYNC_STATUSES.has(p.sync.status)) {
      issues.push(`sync.status must be one of: ${[...VALID_SYNC_STATUSES].join(', ')}`);
    }

    if (p.sync.lastSyncedAt !== undefined && typeof p.sync.lastSyncedAt !== 'number') {
      issues.push('sync.lastSyncedAt must be a number when provided');
    }

    if (p.sync.lastError !== undefined && !isNonEmptyString(p.sync.lastError)) {
      issues.push('sync.lastError must be a non-empty string when provided');
    }
  }

  return { valid: issues.length === 0, issues };
}
