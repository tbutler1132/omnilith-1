/**
 * Web API types — request/response contracts consumed by the rendering layer.
 *
 * Mirrors API payload shapes locally so the web package never imports the
 * kernel directly. Keep this file aligned with backend route contracts.
 */

export type RelationshipType = 'membership' | 'integration-authority' | 'stewardship';
export type MembershipRole = 'founder' | 'member';
export type ProposalStatus = 'open' | 'integrated' | 'declined';
export type EventType =
  | 'organism.created'
  | 'state.appended'
  | 'organism.observed'
  | 'organism.composed'
  | 'organism.decomposed'
  | 'proposal.opened'
  | 'proposal.integrated'
  | 'proposal.declined'
  | 'visibility.changed';
export type VisibilityLevel = 'public' | 'members' | 'private';

export interface Organism {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly createdBy: string;
  readonly openTrunk: boolean;
  readonly forkedFromId?: string;
}

export interface OrganismState {
  readonly id: string;
  readonly organismId: string;
  readonly contentTypeId: string;
  readonly payload: unknown;
  readonly createdAt: number;
  readonly createdBy: string;
  readonly sequenceNumber: number;
  readonly parentStateId?: string;
}

export interface OrganismWithState {
  readonly organism: Organism;
  readonly currentState: OrganismState | undefined;
}

export interface CompositionRecord {
  readonly parentId: string;
  readonly childId: string;
  readonly composedAt: number;
  readonly composedBy: string;
  readonly position?: number;
}

export interface Proposal {
  readonly id: string;
  readonly organismId: string;
  readonly mutation:
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
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
  readonly description?: string;
  readonly proposedBy: string;
  readonly status: ProposalStatus;
  readonly createdAt: number;
  readonly resolvedAt?: number;
  readonly resolvedBy?: string;
  readonly declineReason?: string;
}

export interface DomainEvent {
  readonly id: string;
  readonly type: EventType;
  readonly organismId: string;
  readonly actorId: string;
  readonly occurredAt: number;
  readonly payload: Record<string, unknown>;
}

export interface Relationship {
  readonly id: string;
  readonly type: RelationshipType;
  readonly userId: string;
  readonly organismId: string;
  readonly role?: MembershipRole;
  readonly createdAt: number;
}

export interface VisibilityRecord {
  readonly organismId: string;
  readonly level: VisibilityLevel;
  readonly updatedAt: number;
}

export interface VitalityData {
  readonly organismId: string;
  readonly recentStateChanges: number;
  readonly openProposalCount: number;
  readonly lastActivityAt?: number;
}

export interface OrganismContributor {
  readonly userId: string;
  readonly stateCount: number;
  readonly proposalCount: number;
  readonly integrationCount: number;
  readonly declineCount: number;
  readonly eventCount: number;
  readonly eventTypeCounts: Readonly<Partial<Record<EventType, number>>>;
  readonly lastContributedAt?: number;
}

export interface OrganismContributions {
  readonly organismId: string;
  readonly contributors: ReadonlyArray<OrganismContributor>;
}

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

export interface FetchOrganismResponse {
  readonly organism: Organism;
  readonly currentState: OrganismState | null;
}

export interface FetchOrganismsResponse {
  readonly organisms: ReadonlyArray<OrganismWithState>;
}

export interface AppendStateRequest {
  readonly contentTypeId: string;
  readonly payload: unknown;
}

export interface AppendStateResponse {
  readonly state: OrganismState;
}

export interface SurfaceOrganismOnMapRequest {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
  readonly emphasis?: number;
}

export interface SurfaceMapEntry {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly emphasis?: number;
}

export interface DerivedSurfaceEntrySize {
  readonly size: number;
  readonly strategy: 'community-map-area' | 'compositional-mass';
  readonly inputs: Readonly<Record<string, number | string>>;
}

export type SurfaceOrganismOnMapResponse =
  | {
      readonly status: 'already-surfaced';
      readonly entry: SurfaceMapEntry;
    }
  | {
      readonly status: 'surfaced';
      readonly entry: SurfaceMapEntry;
      readonly state: OrganismState;
      readonly derived: DerivedSurfaceEntrySize;
    };

export interface RecordObservationRequest {
  readonly targetOrganismId: string;
  readonly metric: string;
  readonly value: number;
  readonly sampledAt: number;
}

export interface RecordObservationResponse {
  readonly event: DomainEvent;
}

export interface FetchStateHistoryResponse {
  readonly states: ReadonlyArray<OrganismState>;
}

export interface ComposeChildRequest {
  readonly childId: string;
  readonly position?: number;
}

export interface ComposeChildResponse {
  readonly composition: CompositionRecord;
}

export interface DecomposeChildResponse {
  readonly ok: true;
}

export interface FetchChildrenResponse {
  readonly children: ReadonlyArray<CompositionRecord>;
}

export interface FetchParentResponse {
  readonly parent: CompositionRecord | null;
}

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

export interface FetchProposalsResponse {
  readonly proposals: ReadonlyArray<Proposal>;
}

export type IntegrateProposalResponse =
  | { readonly proposal: Proposal; readonly newState?: OrganismState }
  | { readonly proposal: Proposal; readonly policyDeclined: true };

export interface DeclineProposalRequest {
  readonly reason?: string;
}

export interface DeclineProposalResponse {
  readonly proposal: Proposal;
}

export interface UpdateVisibilityRequest {
  readonly level: VisibilityLevel;
}

export interface UpdateVisibilityResponse {
  readonly ok: true;
}

export interface FetchVisibilityResponse {
  readonly visibility: VisibilityRecord;
}

export interface FetchVitalityResponse {
  readonly vitality: VitalityData;
}

export interface FetchEventsResponse {
  readonly events: ReadonlyArray<DomainEvent>;
}

export interface RegulatorActionExecution {
  readonly id: string;
  readonly boundaryOrganismId: string;
  readonly actionOrganismId: string;
  readonly triggerPolicyOrganismId: string;
  readonly executionMode: string;
  readonly status: string;
  readonly idempotencyKey: string;
  readonly attemptCount: number;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly nextAttemptAt: number;
  readonly lastError: string | null;
  readonly result: unknown;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface FetchActionExecutionsResponse {
  readonly executions: ReadonlyArray<RegulatorActionExecution>;
}

export interface FetchContributionsResponse {
  readonly contributions: OrganismContributions;
}

export interface FetchRelationshipsResponse {
  readonly relationships: ReadonlyArray<Relationship>;
}

export interface InstantiateTemplateResponse {
  readonly organisms: ReadonlyArray<{ ref: string; organismId: string }>;
}

export interface FetchUserOrganismsResponse {
  readonly organisms: ReadonlyArray<OrganismWithState>;
}

export interface FetchUserRelationshipsResponse {
  readonly relationships: ReadonlyArray<Relationship>;
}

export interface FetchUserProposalsResponse {
  readonly proposals: ReadonlyArray<Proposal>;
}

export interface FetchWorldMapResponse {
  readonly worldMapId: string;
}
