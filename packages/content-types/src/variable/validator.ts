/**
 * Variable validator — strict validation for variable payloads.
 *
 * Variables inform governance decisions. A malformed variable could
 * cause a response policy to misfire.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { VariablePayload, VariableThresholds } from './schema.js';

export function validateVariable(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<VariablePayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.label !== 'string' || p.label.length === 0) {
    issues.push('label must be a non-empty string');
  }

  if (typeof p.value !== 'number') {
    issues.push('value must be a number');
  }

  if (p.unit !== undefined && typeof p.unit !== 'string') {
    issues.push('unit must be a string');
  }

  if (p.thresholds !== undefined) {
    if (!p.thresholds || typeof p.thresholds !== 'object') {
      issues.push('thresholds must be an object');
    } else {
      const t = p.thresholds as Partial<VariableThresholds>;
      if (t.low !== undefined && typeof t.low !== 'number') {
        issues.push('thresholds.low must be a number');
      }
      if (t.critical !== undefined && typeof t.critical !== 'number') {
        issues.push('thresholds.critical must be a number');
      }
    }
  }

  if (p.computedFrom !== undefined && typeof p.computedFrom !== 'string') {
    issues.push('computedFrom must be a string');
  }

  if (typeof p.computedAt !== 'number') {
    issues.push('computedAt must be a number');
  }

  return { valid: issues.length === 0, issues };
}
