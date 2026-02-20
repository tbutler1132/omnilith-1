export {
  type DeclineProposalDeps,
  type DeclineProposalInput,
  declineProposal,
} from './decline-proposal.js';
export {
  type EvaluateProposalDeps,
  type EvaluationOutcome,
  evaluateProposal,
} from './evaluate-proposal.js';
export {
  type IntegrateProposalDeps,
  type IntegrateProposalInput,
  type IntegrateProposalResult,
  integrateProposal,
} from './integrate-proposal.js';
export {
  type OpenProposalDeps,
  type OpenProposalInput,
  openProposal,
} from './open-proposal.js';
export type { EncodedProposalMutation, Proposal, ProposalMutation, ProposalStatus } from './proposal.js';
export {
  decodeProposalMutation,
  encodeProposalMutation,
  toLegacyProposalFields,
} from './proposal.js';
export type { ProposalRepository } from './proposal-repository.js';
