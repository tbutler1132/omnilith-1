/**
 * API contracts — shared request and response types for every HTTP endpoint.
 *
 * These types are the single source of truth for the shape of data that
 * crosses the network boundary. Both the API (serialisation) and the web
 * package (deserialisation) import from here, so a field-name mismatch
 * becomes a compile-time error instead of a silent runtime bug.
 */

import type { CompositionRecord } from './composition/composition.js';
import type { DomainEvent } from './events/event.js';
import type { OrganismId } from './identity.js';
import type { Organism } from './organism/organism.js';
import type { OrganismState } from './organism/organism-state.js';
import type { Proposal } from './proposals/proposal.js';
import type { OrganismContributions, OrganismWithState, VitalityData } from './query/query-port.js';
import type { Relationship } from './relationships/relationship.js';
import type { VisibilityLevel, VisibilityRecord } from './visibility/visibility.js';

// ---------------------------------------------------------------------------
// Organisms
// ---------------------------------------------------------------------------

/** POST /organisms — threshold an organism */
export interface ThresholdOrganismRequest {
  readonly name: string;
  readonly contentTypeId: string;
  readonly payload: unknown;
  readonly openTrunk?: boolean;
}

export interface ThresholdOrganismResponse {
  readonly organism: Organism;
  readonly initialState: OrganismState;
}

/** GET /organisms/:id */
export interface FetchOrganismResponse {
  readonly organism: Organism;
  readonly currentState: OrganismState | null;
}

/** GET /organisms */
export interface FetchOrganismsResponse {
  readonly organisms: ReadonlyArray<OrganismWithState>;
}

/** POST /organisms/:id/states — append state (open-trunk) */
export interface AppendStateRequest {
  readonly contentTypeId: string;
  readonly payload: unknown;
}

export interface AppendStateResponse {
  readonly state: OrganismState;
}

/** GET /organisms/:id/states */
export interface FetchStateHistoryResponse {
  readonly states: ReadonlyArray<OrganismState>;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** POST /organisms/:id/children — compose child into parent */
export interface ComposeChildRequest {
  readonly childId: string;
  readonly position?: number;
}

export interface ComposeChildResponse {
  readonly composition: CompositionRecord;
}

/** DELETE /organisms/:id/children/:childId */
export interface DecomposeChildResponse {
  readonly ok: true;
}

/** GET /organisms/:id/children */
export interface FetchChildrenResponse {
  readonly children: ReadonlyArray<CompositionRecord>;
}

/** GET /organisms/:id/parent */
export interface FetchParentResponse {
  readonly parent: CompositionRecord | null;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

/** POST /organisms/:id/proposals — open a proposal */
export interface OpenProposalRequest {
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
  readonly description?: string;
}

export interface OpenProposalResponse {
  readonly proposal: Proposal;
}

/** GET /organisms/:id/proposals */
export interface FetchProposalsResponse {
  readonly proposals: ReadonlyArray<Proposal>;
}

/** POST /proposals/:id/integrate */
export type IntegrateProposalResponse =
  | { readonly proposal: Proposal; readonly newState: OrganismState }
  | { readonly proposal: Proposal; readonly policyDeclined: true };

/** POST /proposals/:id/decline */
export interface DeclineProposalRequest {
  readonly reason?: string;
}

export interface DeclineProposalResponse {
  readonly proposal: Proposal;
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** PUT /organisms/:id/visibility */
export interface UpdateVisibilityRequest {
  readonly level: VisibilityLevel;
}

export interface UpdateVisibilityResponse {
  readonly ok: true;
}

/** GET /organisms/:id/visibility */
export interface FetchVisibilityResponse {
  readonly visibility: VisibilityRecord;
}

// ---------------------------------------------------------------------------
// Vitality, Events, Relationships
// ---------------------------------------------------------------------------

/** GET /organisms/:id/vitality */
export interface FetchVitalityResponse {
  readonly vitality: VitalityData;
}

/** GET /organisms/:id/events */
export interface FetchEventsResponse {
  readonly events: ReadonlyArray<DomainEvent>;
}

/** GET /organisms/:id/contributions */
export interface FetchContributionsResponse {
  readonly contributions: OrganismContributions;
}

/** GET /organisms/:id/relationships */
export interface FetchRelationshipsResponse {
  readonly relationships: ReadonlyArray<Relationship>;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** POST /templates/:id/instantiate */
export interface InstantiateTemplateResponse {
  readonly organisms: ReadonlyArray<{ ref: string; organismId: OrganismId }>;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** GET /users/me/organisms */
export interface FetchUserOrganismsResponse {
  readonly organisms: ReadonlyArray<OrganismWithState>;
}

/** GET /users/me/proposals */
export interface FetchUserProposalsResponse {
  readonly proposals: ReadonlyArray<Proposal>;
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

/** GET /platform/world-map */
export interface FetchWorldMapResponse {
  readonly worldMapId: string;
}
