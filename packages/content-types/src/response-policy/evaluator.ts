/**
 * Response policy evaluator — cybernetic governance through variable thresholds.
 *
 * When a proposal arrives at a parent organism, and this response policy
 * is composed inside it, this evaluator checks whether the variable
 * condition is triggered. If health drops below a threshold, proposals
 * are declined to protect the organism. If health recovers, proposals
 * flow normally again.
 *
 * The evaluator reads the variable value from its own payload
 * (currentVariableValue). It does not query other organisms. The loop
 * runner writes the latest variable snapshot into the policy's state.
 * This keeps the evaluator pure — no external dependencies.
 */

import type { EvaluationResult, ProposalForEvaluation } from '@omnilith/kernel';
import type { ResponsePolicyPayload } from './schema.js';

export function evaluateResponsePolicy(
  _proposal: ProposalForEvaluation,
  policyPayload: unknown,
): EvaluationResult {
  const policy = policyPayload as ResponsePolicyPayload;

  if (policy.mode !== 'variable-threshold') {
    return { decision: 'decline', reason: `Unknown response policy mode: ${policy.mode}` };
  }

  // If no variable value has been written yet, pass by default.
  // The loop runner hasn't populated the snapshot yet.
  if (policy.currentVariableValue === undefined) {
    return { decision: 'pass' };
  }

  const triggered =
    policy.condition === 'below'
      ? policy.currentVariableValue < policy.threshold
      : policy.currentVariableValue > policy.threshold;

  if (triggered) {
    return policy.action === 'decline-all'
      ? { decision: 'decline', reason: policy.reason }
      : { decision: 'pass' };
  }

  // Condition not triggered — inverse of the action
  return policy.action === 'decline-all'
    ? { decision: 'pass' }
    : { decision: 'decline', reason: policy.reason };
}
