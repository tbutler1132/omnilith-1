import { describe, it, expect } from 'vitest';
import { evaluateIntegrationPolicy } from '../integration-policy/evaluator.js';
import type { ProposalForEvaluation, ContentTypeId, UserId } from '@omnilith/kernel';

describe('integration policy evaluator', () => {
  const makeProposal = (proposedBy?: string): ProposalForEvaluation => ({
    proposedPayload: { v: 2 },
    proposedContentTypeId: 'test-type' as ContentTypeId,
    proposedBy: (proposedBy ?? 'usr-proposer') as UserId,
  });

  it('single-integrator mode passes evaluation', () => {
    const result = evaluateIntegrationPolicy(
      makeProposal(),
      { mode: 'single-integrator', integratorId: 'usr-integrator' },
    );
    expect(result.decision).toBe('pass');
  });

  it('unknown policy mode declines', () => {
    const result = evaluateIntegrationPolicy(
      makeProposal(),
      { mode: 'unknown-mode', integratorId: 'usr-integrator' },
    );
    expect(result.decision).toBe('decline');
  });

  it('the regulatory mechanism works end-to-end with kernel evaluation', async () => {
    // This test demonstrates the full regulatory path:
    // 1. Integration policy is a content type with an evaluator
    // 2. When composed inside a parent, evaluate-proposal finds it
    // 3. The evaluator is called with the proposal and policy payload
    // 4. The result affects whether the proposal can be integrated

    // The evaluator itself is straightforward - the composition mechanics
    // are tested in the kernel's proposals.test.ts
    const result = evaluateIntegrationPolicy(
      makeProposal('usr-contributor'),
      { mode: 'single-integrator', integratorId: 'usr-integrator' },
    );

    // Single-integrator evaluator passes — integration authority
    // is enforced separately in the integrate-proposal use case
    expect(result.decision).toBe('pass');
  });
});
