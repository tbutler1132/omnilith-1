/**
 * Response policy validator — strict validation for governance payloads.
 *
 * Response policies make autonomous governance decisions. A malformed
 * policy could silently decline all proposals or silently pass everything.
 * Every field is validated strictly.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { ResponsePolicyPayload } from './schema.js';

const VALID_CONDITIONS = new Set(['below', 'above']);
const VALID_ACTIONS = new Set(['decline-all', 'pass']);

export function validateResponsePolicy(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<ResponsePolicyPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (p.mode !== 'variable-threshold') {
    issues.push("mode must be 'variable-threshold'");
  }

  if (typeof p.variableLabel !== 'string' || p.variableLabel.length === 0) {
    issues.push('variableLabel must be a non-empty string');
  }

  if (typeof p.condition !== 'string' || !VALID_CONDITIONS.has(p.condition)) {
    issues.push("condition must be 'below' or 'above'");
  }

  if (typeof p.threshold !== 'number') {
    issues.push('threshold must be a number');
  }

  if (p.currentVariableValue !== undefined && typeof p.currentVariableValue !== 'number') {
    issues.push('currentVariableValue must be a number');
  }

  if (typeof p.action !== 'string' || !VALID_ACTIONS.has(p.action)) {
    issues.push("action must be 'decline-all' or 'pass'");
  }

  if (typeof p.reason !== 'string' || p.reason.length === 0) {
    issues.push('reason must be a non-empty string');
  }

  return { valid: issues.length === 0, issues };
}
