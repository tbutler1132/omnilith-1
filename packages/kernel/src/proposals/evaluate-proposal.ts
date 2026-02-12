/**
 * evaluateProposal — the heart of regulation.
 *
 * When a proposal is opened, we check whether the target organism
 * contains any policy organisms. If it does, each policy organism's
 * content type evaluator is consulted. Any decline means the proposal
 * is declined. Otherwise, it passes.
 *
 * Scope rule: Policy organisms apply only to their direct parent.
 * An integration policy inside an album governs proposals to the album.
 * It does NOT govern proposals to songs inside the album. Each
 * organism's governance is self-contained within its boundary.
 */

import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import type { CompositionRepository } from '../composition/composition-repository.js';
import type { StateRepository } from '../organism/state-repository.js';
import type { Proposal } from './proposal.js';
import type { EvaluationResult, ProposalForEvaluation } from '../content-types/content-type-contract.js';

export interface EvaluateProposalDeps {
  readonly compositionRepository: CompositionRepository;
  readonly stateRepository: StateRepository;
  readonly contentTypeRegistry: ContentTypeRegistry;
}

export interface EvaluationOutcome {
  readonly passed: boolean;
  readonly results: ReadonlyArray<{
    readonly policyOrganismId: string;
    readonly result: EvaluationResult;
  }>;
}

export async function evaluateProposal(
  proposal: Proposal,
  deps: EvaluateProposalDeps,
): Promise<EvaluationOutcome> {
  // Find all direct children of the target organism
  const children = await deps.compositionRepository.findChildren(proposal.organismId);

  const results: Array<{
    policyOrganismId: string;
    result: EvaluationResult;
  }> = [];

  for (const child of children) {
    // Get the current state of each child
    const childState = await deps.stateRepository.findCurrentByOrganismId(child.childId);
    if (!childState) continue;

    // Look up its content type
    const contract = deps.contentTypeRegistry.get(childState.contentTypeId);
    if (!contract?.evaluate) continue;

    // This child is a policy organism — let it evaluate
    const proposalForEvaluation: ProposalForEvaluation = {
      proposedPayload: proposal.proposedPayload,
      proposedContentTypeId: proposal.proposedContentTypeId,
      proposedBy: proposal.proposedBy,
    };

    const result = contract.evaluate(proposalForEvaluation, childState.payload);
    results.push({ policyOrganismId: child.childId, result });

    // Any decline means the whole evaluation fails
    if (result.decision === 'decline') {
      return { passed: false, results };
    }
  }

  return { passed: true, results };
}
