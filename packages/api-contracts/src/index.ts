/**
 * API contracts — shared request and response types for every HTTP endpoint.
 *
 * These types are the single source of truth for the shape of data that
 * crosses the network boundary. Both the API (serialisation) and the web
 * package (deserialisation) import from here, so a field-name mismatch
 * becomes a compile-time error instead of a silent runtime bug.
 */

// ---------------------------------------------------------------------------
// Wire primitives + shared DTOs
// ---------------------------------------------------------------------------

export type ApiId = string;
export type ApiTimestamp = number;

export type VisibilityLevel = 'public' | 'members' | 'private';
export type RelationshipType = 'membership' | 'integration-authority' | 'stewardship';
export type MembershipRole = 'founder' | 'member';
export type ProposalStatus = 'open' | 'integrated' | 'declined';
export type AccessAction =
  | 'view'
  | 'append-state'
  | 'record-observation'
  | 'open-proposal'
  | 'integrate-proposal'
  | 'decline-proposal'
  | 'compose'
  | 'decompose'
  | 'change-visibility'
  | 'change-open-trunk';

export type EventType =
  | 'organism.created'
  | 'state.appended'
  | 'organism.observed'
  | 'organism.composed'
  | 'organism.decomposed'
  | 'proposal.opened'
  | 'proposal.integrated'
  | 'proposal.declined'
  | 'visibility.changed'
  | 'organism.open-trunk-changed';

export interface Organism {
  readonly id: ApiId;
  readonly name: string;
  readonly createdAt: ApiTimestamp;
  readonly createdBy: ApiId;
  readonly openTrunk: boolean;
  readonly forkedFromId?: ApiId;
}

export interface OrganismState {
  readonly id: ApiId;
  readonly organismId: ApiId;
  readonly contentTypeId: string;
  readonly payload: unknown;
  readonly createdAt: ApiTimestamp;
  readonly createdBy: ApiId;
  readonly sequenceNumber: number;
  readonly parentStateId?: ApiId;
}

export interface CompositionRecord {
  readonly parentId: ApiId;
  readonly childId: ApiId;
  readonly composedAt: ApiTimestamp;
  readonly composedBy: ApiId;
  readonly position?: number;
}

export interface ProposalMutation {
  readonly kind: 'append-state' | 'compose' | 'decompose' | 'change-visibility';
  readonly contentTypeId?: string;
  readonly payload?: unknown;
  readonly childId?: ApiId;
  readonly position?: number;
  readonly level?: VisibilityLevel;
}

export interface Proposal {
  readonly id: ApiId;
  readonly organismId: ApiId;
  readonly mutation: ProposalMutation;
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
  readonly description?: string;
  readonly proposedBy: ApiId;
  readonly status: ProposalStatus;
  readonly createdAt: ApiTimestamp;
  readonly resolvedAt?: ApiTimestamp;
  readonly resolvedBy?: ApiId;
  readonly declineReason?: string;
}

export interface DomainEvent {
  readonly id: ApiId;
  readonly type: EventType;
  readonly organismId: ApiId;
  readonly actorId: ApiId;
  readonly occurredAt: ApiTimestamp;
  readonly payload: Record<string, unknown>;
}

export interface Relationship {
  readonly id: ApiId;
  readonly type: RelationshipType;
  readonly userId: ApiId;
  readonly organismId: ApiId;
  readonly role?: MembershipRole;
  readonly createdAt: ApiTimestamp;
}

export interface VisibilityRecord {
  readonly organismId: ApiId;
  readonly level: VisibilityLevel;
  readonly updatedAt: ApiTimestamp;
}

export interface OrganismWithState {
  readonly organism: Organism;
  readonly currentState: OrganismState | undefined;
}

export interface VitalityData {
  readonly organismId: ApiId;
  readonly recentStateChanges: number;
  readonly openProposalCount: number;
  readonly lastActivityAt?: ApiTimestamp;
}

export interface OrganismContributor {
  readonly userId: ApiId;
  readonly stateCount: number;
  readonly proposalCount: number;
  readonly integrationCount: number;
  readonly declineCount: number;
  readonly eventCount: number;
  readonly eventTypeCounts: Readonly<Partial<Record<EventType, number>>>;
  readonly lastContributedAt?: ApiTimestamp;
}

export interface OrganismContributions {
  readonly organismId: ApiId;
  readonly contributors: ReadonlyArray<OrganismContributor>;
}

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
  readonly surface?: {
    readonly mapOrganismId: ApiId;
    readonly status: 'surfaced' | 'already-surfaced';
    readonly entry: {
      readonly organismId: ApiId;
      readonly x: number;
      readonly y: number;
      readonly size?: number;
      readonly emphasis?: number;
    };
  };
}

/** GET /organisms/:id */
interface FetchOrganismRecord {
  readonly id: string;
  readonly name: string;
  readonly openTrunk?: boolean;
}

interface FetchOrganismStateRecord {
  readonly contentTypeId: string;
  readonly payload: unknown;
}

export interface FetchOrganismResponse {
  readonly organism: FetchOrganismRecord;
  readonly currentState: FetchOrganismStateRecord | null;
}

/** GET /organisms/:id/access?action=<action> */
export interface FetchOrganismAccessResponse {
  readonly action: AccessAction;
  readonly allowed: boolean;
  readonly reason: string | null;
}

/** GET /public/organisms?ids=<id,id,...> */
export interface FetchOrganismBatchResponse {
  readonly organisms: ReadonlyArray<FetchOrganismResponse>;
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

/** POST /organisms/:id/observations — record an observation event */
export interface RecordObservationRequest {
  readonly targetOrganismId: ApiId;
  readonly metric: string;
  readonly value: number;
  readonly sampledAt: number;
}

export interface RecordObservationResponse {
  readonly event: DomainEvent;
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

/** GET /organisms/:id/children-with-state */
export interface ChildWithStateRecord {
  readonly composition: CompositionRecord;
  readonly organism: Organism;
  readonly currentState: OrganismState | null;
}

export interface FetchChildrenWithStateResponse {
  readonly children: ReadonlyArray<ChildWithStateRecord>;
}

/** GET /organisms/:id/parent */
export interface FetchParentResponse {
  readonly parent: CompositionRecord | null;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

/** POST /organisms/:id/proposals — open a proposal */
export type OpenProposalMutationRequest =
  | {
      readonly kind: 'append-state';
      readonly contentTypeId: string;
      readonly payload: unknown;
    }
  | {
      readonly kind: 'compose';
      readonly childId: string;
      readonly position?: number;
    }
  | {
      readonly kind: 'decompose';
      readonly childId: string;
    }
  | {
      readonly kind: 'change-visibility';
      readonly level: VisibilityLevel;
    };

export interface OpenLegacyStateProposalRequest {
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
  readonly description?: string;
}

export interface OpenMutationProposalRequest {
  readonly mutation: OpenProposalMutationRequest;
  readonly description?: string;
}

export type OpenProposalRequest = OpenLegacyStateProposalRequest | OpenMutationProposalRequest;

export interface OpenProposalResponse {
  readonly proposal: Proposal;
}

/** GET /organisms/:id/proposals */
export interface FetchProposalsResponse {
  readonly proposals: ReadonlyArray<Proposal>;
}

/** POST /proposals/:id/integrate */
export type IntegrateProposalResponse =
  | { readonly proposal: Proposal; readonly newState?: OrganismState }
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

/** PUT /organisms/:id/open-trunk */
export interface UpdateOpenTrunkRequest {
  readonly openTrunk: boolean;
}

export interface UpdateOpenTrunkResponse {
  readonly organism: Organism;
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
  readonly organisms: ReadonlyArray<{ ref: string; organismId: ApiId }>;
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
  readonly worldMapId: string | null;
}
