/**
 * GitHub issue validator — strict validation for issue twins.
 *
 * Issue twins are used as automation and governance trace records, so
 * proposal linkage and external identifiers must remain well-formed.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { GitHubIssuePayload } from './schema.js';

const VALID_STATES = new Set(['open', 'closed']);
const VALID_SYNC_STATUSES = new Set(['pending', 'synced', 'failed']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIssueUrl(value: unknown): boolean {
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

export function validateGitHubIssue(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<GitHubIssuePayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (!isNonEmptyString(p.repositoryOrganismId)) {
    issues.push('repositoryOrganismId must be a non-empty string');
  }

  if (!isNonEmptyString(p.sourceProposalId)) {
    issues.push('sourceProposalId must be a non-empty string');
  }

  if (!isNonEmptyString(p.sourceOrganismId)) {
    issues.push('sourceOrganismId must be a non-empty string');
  }

  if (p.externalIssueNumber !== undefined) {
    if (!Number.isInteger(p.externalIssueNumber) || p.externalIssueNumber <= 0) {
      issues.push('externalIssueNumber must be a positive integer when provided');
    }
  }

  if (p.externalIssueUrl !== undefined && !isValidIssueUrl(p.externalIssueUrl)) {
    issues.push('externalIssueUrl must be a valid http(s) URL when provided');
  }

  if (!isNonEmptyString(p.title)) {
    issues.push('title must be a non-empty string');
  }

  if (typeof p.body !== 'string') {
    issues.push('body must be a string');
  }

  if (typeof p.state !== 'string' || !VALID_STATES.has(p.state)) {
    issues.push(`state must be one of: ${[...VALID_STATES].join(', ')}`);
  }

  if (!Array.isArray(p.labels)) {
    issues.push('labels must be an array');
  } else {
    for (let i = 0; i < p.labels.length; i++) {
      if (!isNonEmptyString(p.labels[i])) {
        issues.push(`labels[${i}] must be a non-empty string`);
      }
    }
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
