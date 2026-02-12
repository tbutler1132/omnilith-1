/**
 * @omnilith/kernel — the physics of the platform.
 *
 * Eight infrastructure concerns that make organisms possible.
 * Pure TypeScript. Zero external dependencies.
 */

// Identity
export type {
  OrganismId,
  UserId,
  StateId,
  ProposalId,
  ContentTypeId,
  EventId,
  RelationshipId,
  Timestamp,
  IdentityGenerator,
} from './identity.js';

// Errors
export {
  OrganismNotFoundError,
  StateNotFoundError,
  AccessDeniedError,
  ValidationFailedError,
  ContentTypeNotRegisteredError,
  CompositionError,
  ProposalAlreadyResolvedError,
  ProposalNotFoundError,
  type DomainError,
} from './errors.js';

// Organism + State
export type { Organism } from './organism/organism.js';
export type { OrganismState } from './organism/organism-state.js';
export type { OrganismRepository } from './organism/organism-repository.js';
export type { StateRepository } from './organism/state-repository.js';
export {
  createOrganism,
  type CreateOrganismInput,
  type CreateOrganismResult,
  type CreateOrganismDeps,
} from './organism/create-organism.js';
export {
  appendState,
  type AppendStateInput,
  type AppendStateDeps,
} from './organism/append-state.js';

// Events
export type { DomainEvent, EventType } from './events/event.js';
export type { EventPublisher } from './events/event-publisher.js';

// Content Types
export type {
  ContentTypeContract,
  ValidationResult,
  EvaluationResult,
  ProposalForEvaluation,
} from './content-types/content-type-contract.js';
export type { ContentTypeRegistry } from './content-types/content-type-registry.js';

// Composition
export type { CompositionRecord } from './composition/composition.js';
export type { CompositionRepository } from './composition/composition-repository.js';
export {
  composeOrganism,
  type ComposeOrganismInput,
  type ComposeOrganismDeps,
} from './composition/compose-organism.js';
export {
  decomposeOrganism,
  type DecomposeOrganismInput,
  type DecomposeOrganismDeps,
} from './composition/decompose-organism.js';
export { queryChildren, type QueryChildrenDeps } from './composition/query-children.js';
export { queryParent, type QueryParentDeps } from './composition/query-parent.js';

// Relationships
export type {
  Relationship,
  RelationshipType,
  MembershipRole,
} from './relationships/relationship.js';
export type { RelationshipRepository } from './relationships/relationship-repository.js';

// Visibility + Access Control
export type { VisibilityLevel, VisibilityRecord } from './visibility/visibility.js';
export type { VisibilityRepository } from './visibility/visibility-repository.js';
export {
  checkAccess,
  type ActionType,
  type AccessDecision,
  type AccessControlDeps,
} from './visibility/access-control.js';
export { checkAccessOrThrow } from './visibility/check-access.js';

// Proposals
export type { Proposal, ProposalStatus } from './proposals/proposal.js';
export type { ProposalRepository } from './proposals/proposal-repository.js';
export {
  openProposal,
  type OpenProposalInput,
  type OpenProposalDeps,
} from './proposals/open-proposal.js';
export {
  evaluateProposal,
  type EvaluateProposalDeps,
  type EvaluationOutcome,
} from './proposals/evaluate-proposal.js';
export {
  integrateProposal,
  type IntegrateProposalInput,
  type IntegrateProposalDeps,
  type IntegrateProposalResult,
} from './proposals/integrate-proposal.js';
export {
  declineProposal,
  type DeclineProposalInput,
  type DeclineProposalDeps,
} from './proposals/decline-proposal.js';

// Query
export type {
  QueryPort,
  OrganismWithState,
  VitalityData,
  QueryFilters,
} from './query/query-port.js';
