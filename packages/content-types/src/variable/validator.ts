/**
 * Variable validator — strict validation for variable payloads.
 *
 * Variables inform governance decisions. A malformed variable could
 * cause a response policy to misfire.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { VariableComputation, VariablePayload, VariableThresholds } from './schema.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

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

  if (p.computation !== undefined) {
    if (!p.computation || typeof p.computation !== 'object') {
      issues.push('computation must be an object');
    } else {
      const computation = p.computation as Partial<VariableComputation>;
      if (computation.mode !== 'observation-sum') {
        issues.push("computation.mode must be 'observation-sum'");
      }
      if (computation.sensorLabel !== undefined && !isNonEmptyString(computation.sensorLabel)) {
        issues.push('computation.sensorLabel must be a non-empty string when provided');
      }
      if (computation.sensorOrganismId !== undefined && !isNonEmptyString(computation.sensorOrganismId)) {
        issues.push('computation.sensorOrganismId must be a non-empty string when provided');
      }
      if (!isNonEmptyString(computation.sensorLabel) && !isNonEmptyString(computation.sensorOrganismId)) {
        issues.push('computation must include sensorLabel or sensorOrganismId');
      }
      if (typeof computation.metric !== 'string' || computation.metric.length === 0) {
        issues.push('computation.metric must be a non-empty string');
      }
      if (computation.windowSeconds !== undefined && typeof computation.windowSeconds !== 'number') {
        issues.push('computation.windowSeconds must be a number when provided');
      }
      if (computation.clampMin !== undefined && typeof computation.clampMin !== 'number') {
        issues.push('computation.clampMin must be a number when provided');
      }
      if (computation.clampMax !== undefined && typeof computation.clampMax !== 'number') {
        issues.push('computation.clampMax must be a number when provided');
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
