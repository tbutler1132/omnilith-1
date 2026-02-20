/**
 * @omnilith/kernel — the physics of the platform.
 *
 * Eight infrastructure concerns that make organisms possible.
 * Pure TypeScript. Zero external dependencies.
 */

// API Contracts
export type {
  AppendStateRequest,
  AppendStateResponse,
  ComposeChildRequest,
  ComposeChildResponse,
  DeclineProposalRequest,
  DeclineProposalResponse,
  DecomposeChildResponse,
  FetchChildrenResponse,
  FetchContributionsResponse,
  FetchEventsResponse,
  FetchOrganismResponse,
  FetchOrganismsResponse,
  FetchParentResponse,
  FetchProposalsResponse,
  FetchRelationshipsResponse,
  FetchStateHistoryResponse,
  FetchUserOrganismsResponse,
  FetchUserProposalsResponse,
  FetchVisibilityResponse,
  FetchVitalityResponse,
  FetchWorldMapResponse,
  InstantiateTemplateResponse,
  IntegrateProposalResponse,
  OpenLegacyStateProposalRequest,
  OpenMutationProposalRequest,
  OpenProposalMutationRequest,
  OpenProposalRequest,
  OpenProposalResponse,
  ThresholdOrganismRequest,
  ThresholdOrganismResponse,
  UpdateVisibilityRequest,
  UpdateVisibilityResponse,
} from './api-contracts.js';
export {
  type ComposeOrganismDeps,
  type ComposeOrganismInput,
  composeOrganism,
} from './composition/compose-organism.js';
// Composition
export type { CompositionRecord } from './composition/composition.js';
export type { CompositionRepository } from './composition/composition-repository.js';
export {
  type DecomposeOrganismDeps,
  type DecomposeOrganismInput,
  decomposeOrganism,
} from './composition/decompose-organism.js';
export { type QueryChildrenDeps, queryChildren } from './composition/query-children.js';
export { type QueryParentDeps, queryParent } from './composition/query-parent.js';
// Content Types
export type {
  ContentTypeContract,
  EvaluationResult,
  ProposalForEvaluation,
  ValidationContext,
  ValidationResult,
} from './content-types/content-type-contract.js';
export type { ContentTypeRegistry } from './content-types/content-type-registry.js';
// Errors
export {
  AccessDeniedError,
  CompositionError,
  ContentTypeNotRegisteredError,
  type DomainError,
  OrganismNotFoundError,
  ProposalAlreadyResolvedError,
  ProposalNotFoundError,
  StateNotFoundError,
  ValidationFailedError,
} from './errors.js';
// Events
export type { DomainEvent, EventType } from './events/event.js';
export type { EventPublisher } from './events/event-publisher.js';
export type { EventRepository } from './events/event-repository.js';
// Identity
export type {
  ContentTypeId,
  EventId,
  IdentityGenerator,
  OrganismId,
  ProposalId,
  RelationshipId,
  StateId,
  Timestamp,
  UserId,
} from './identity.js';
export {
  type AppendStateDeps,
  type AppendStateInput,
  appendState,
} from './organism/append-state.js';
export {
  type CreateOrganismDeps,
  type CreateOrganismInput,
  type CreateOrganismResult,
  createOrganism,
} from './organism/create-organism.js';
// Organism + State
export type { Organism } from './organism/organism.js';
export type { OrganismRepository } from './organism/organism-repository.js';
export type { OrganismState } from './organism/organism-state.js';
export type { StateRepository } from './organism/state-repository.js';
export {
  type DeclineProposalDeps,
  type DeclineProposalInput,
  declineProposal,
} from './proposals/decline-proposal.js';
export {
  type EvaluateProposalDeps,
  type EvaluationOutcome,
  evaluateProposal,
} from './proposals/evaluate-proposal.js';
export {
  type IntegrateProposalDeps,
  type IntegrateProposalInput,
  type IntegrateProposalResult,
  integrateProposal,
} from './proposals/integrate-proposal.js';
export {
  type OpenProposalDeps,
  type OpenProposalInput,
  openProposal,
} from './proposals/open-proposal.js';
// Proposals
export type { EncodedProposalMutation, Proposal, ProposalMutation, ProposalStatus } from './proposals/proposal.js';
export {
  decodeProposalMutation,
  encodeProposalMutation,
  toLegacyProposalFields,
} from './proposals/proposal.js';
export type { ProposalRepository } from './proposals/proposal-repository.js';
// Query
export type {
  OrganismContributions,
  OrganismContributor,
  OrganismWithState,
  QueryFilters,
  QueryPort,
  VitalityData,
} from './query/query-port.js';
// Relationships
export type {
  MembershipRole,
  Relationship,
  RelationshipType,
} from './relationships/relationship.js';
export type { RelationshipRepository } from './relationships/relationship-repository.js';
export {
  type AccessControlDeps,
  type AccessDecision,
  type ActionType,
  checkAccess,
} from './visibility/access-control.js';
export {
  type ChangeVisibilityDeps,
  type ChangeVisibilityInput,
  changeVisibility,
} from './visibility/change-visibility.js';
export { checkAccessOrThrow } from './visibility/check-access.js';
// Visibility + Access Control
export type { VisibilityLevel, VisibilityRecord } from './visibility/visibility.js';
export type { VisibilityRepository } from './visibility/visibility-repository.js';
