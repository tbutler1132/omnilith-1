/**
 * Action validator — strict validation for executable policy endpoints.
 *
 * Actions can invoke external systems, so malformed payloads are rejected
 * before they can enter state history.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { ActionPayload, ActionTrigger, GitHubPrActionConfig, OpenProposalActionConfig } from './schema.js';

const VALID_KINDS = new Set(['github-pr', 'open-proposal']);
const VALID_EXECUTION_MODES = new Set(['direct-low-risk', 'proposal-required']);
const VALID_RISK_LEVELS = new Set(['low', 'high']);
const VALID_DECISIONS = new Set(['pass', 'decline']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateTrigger(trigger: unknown, issues: string[]): void {
  const value = trigger as Partial<ActionTrigger>;
  if (!value || typeof value !== 'object') {
    issues.push('trigger must be an object');
    return;
  }

  if (!isNonEmptyString(value.responsePolicyOrganismId)) {
    issues.push('trigger.responsePolicyOrganismId must be a non-empty string');
  }

  if (typeof value.whenDecision !== 'string' || !VALID_DECISIONS.has(value.whenDecision)) {
    issues.push("trigger.whenDecision must be 'pass' or 'decline'");
  }
}

function validateGitHubPrConfig(config: unknown, issues: string[]): void {
  const value = config as Partial<GitHubPrActionConfig>;
  if (!value || typeof value !== 'object') {
    issues.push('config must be an object');
    return;
  }

  if (!isNonEmptyString(value.owner)) {
    issues.push('config.owner must be a non-empty string');
  }
  if (!isNonEmptyString(value.repository)) {
    issues.push('config.repository must be a non-empty string');
  }
  if (!isNonEmptyString(value.baseBranch)) {
    issues.push('config.baseBranch must be a non-empty string');
  }
  if (!isNonEmptyString(value.headBranch)) {
    issues.push('config.headBranch must be a non-empty string');
  }
  if (!isNonEmptyString(value.title)) {
    issues.push('config.title must be a non-empty string');
  }
  if (!isNonEmptyString(value.body)) {
    issues.push('config.body must be a non-empty string');
  }
  if (value.draft !== undefined && typeof value.draft !== 'boolean') {
    issues.push('config.draft must be a boolean when provided');
  }
}

function validateOpenProposalConfig(config: unknown, issues: string[]): void {
  const value = config as Partial<OpenProposalActionConfig>;
  if (!value || typeof value !== 'object') {
    issues.push('config must be an object');
    return;
  }

  if (!isNonEmptyString(value.targetOrganismId)) {
    issues.push('config.targetOrganismId must be a non-empty string');
  }
  if (!isNonEmptyString(value.proposedContentTypeId)) {
    issues.push('config.proposedContentTypeId must be a non-empty string');
  }
  if (value.proposedPayload === undefined) {
    issues.push('config.proposedPayload is required');
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    issues.push('config.description must be a string when provided');
  }
}

export function validateAction(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<ActionPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (!isNonEmptyString(p.label)) {
    issues.push('label must be a non-empty string');
  }

  if (typeof p.kind !== 'string' || !VALID_KINDS.has(p.kind)) {
    issues.push("kind must be 'github-pr' or 'open-proposal'");
  }

  if (typeof p.executionMode !== 'string' || !VALID_EXECUTION_MODES.has(p.executionMode)) {
    issues.push("executionMode must be 'direct-low-risk' or 'proposal-required'");
  }

  if (typeof p.riskLevel !== 'string' || !VALID_RISK_LEVELS.has(p.riskLevel)) {
    issues.push("riskLevel must be 'low' or 'high'");
  }

  validateTrigger(p.trigger, issues);

  if (p.kind === 'github-pr') {
    validateGitHubPrConfig(p.config, issues);
  } else if (p.kind === 'open-proposal') {
    validateOpenProposalConfig(p.config, issues);
  }

  if (p.cooldownSeconds !== undefined) {
    if (typeof p.cooldownSeconds !== 'number' || !Number.isFinite(p.cooldownSeconds) || p.cooldownSeconds < 0) {
      issues.push('cooldownSeconds must be a finite non-negative number when provided');
    }
  }

  if (p.lastExecutedAt !== undefined && (typeof p.lastExecutedAt !== 'number' || !Number.isFinite(p.lastExecutedAt))) {
    issues.push('lastExecutedAt must be a finite number when provided');
  }

  if (p.lastExecutionKey !== undefined && !isNonEmptyString(p.lastExecutionKey)) {
    issues.push('lastExecutionKey must be a non-empty string when provided');
  }

  return { valid: issues.length === 0, issues };
}
