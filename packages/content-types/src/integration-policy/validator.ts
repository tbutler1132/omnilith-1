/**
 * validateIntegrationPolicy — validate integration-policy state payloads.
 *
 * Guards state appends and proposals by rejecting malformed integration-policy
 * payloads before they can enter state history.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { IntegrationPolicyPayload } from './schema.js';

export function validateIntegrationPolicy(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<IntegrationPolicyPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (p.mode !== 'single-integrator') {
    issues.push("mode must be 'single-integrator'");
  }

  if (typeof p.integratorId !== 'string' || p.integratorId.length === 0) {
    issues.push('integratorId must be a non-empty string');
  }

  return { valid: issues.length === 0, issues };
}
