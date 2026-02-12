/**
 * Integration policy evaluator — the regulatory mechanism.
 *
 * When a proposal arrives at a parent organism, and this policy
 * organism is composed inside it, this evaluator is consulted.
 * It checks whether the proposer has integration authority.
 *
 * Note: In the single-integrator model, the evaluator always passes.
 * The actual authority check happens in the integrate-proposal use case
 * via the access control module. The evaluator's role is to allow
 * content-type-specific policy logic (e.g., checking payload constraints).
 * More complex evaluators in Phase 2 (multi-approver, threshold-based)
 * will implement substantive evaluation logic here.
 */

import type { EvaluationResult, ProposalForEvaluation } from '@omnilith/kernel';
import type { IntegrationPolicyPayload } from './schema.js';

export function evaluateIntegrationPolicy(_proposal: ProposalForEvaluation, policyPayload: unknown): EvaluationResult {
  const policy = policyPayload as IntegrationPolicyPayload;

  if (policy.mode !== 'single-integrator') {
    return { decision: 'decline', reason: `Unknown policy mode: ${policy.mode}` };
  }

  // Single-integrator mode: the evaluator passes.
  // Integration authority is enforced in the integrate-proposal use case.
  return { decision: 'pass' };
}
