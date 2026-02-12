export type { Proposal, ProposalStatus } from './proposal.js';
export type { ProposalRepository } from './proposal-repository.js';
export {
  openProposal,
  type OpenProposalInput,
  type OpenProposalDeps,
} from './open-proposal.js';
export {
  evaluateProposal,
  type EvaluateProposalDeps,
  type EvaluationOutcome,
} from './evaluate-proposal.js';
export {
  integrateProposal,
  type IntegrateProposalInput,
  type IntegrateProposalDeps,
  type IntegrateProposalResult,
} from './integrate-proposal.js';
export {
  declineProposal,
  type DeclineProposalInput,
  type DeclineProposalDeps,
} from './decline-proposal.js';
