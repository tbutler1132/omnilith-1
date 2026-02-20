/**
 * Proposal — an offered mutation for an organism.
 *
 * Proposals are the central interaction between people and organisms.
 * When a proposal arrives, the infrastructure checks for policy organisms
 * inside the target organism and lets them evaluate. The result is
 * integration (mutation applies) or decline (organism remains as-is).
 *
 * Proposals work identically whether the source is an internal
 * contributor or a cross-boundary fork.
 */

import type { ContentTypeId, OrganismId, ProposalId, Timestamp, UserId } from '../identity.js';
import type { VisibilityLevel } from '../visibility/visibility.js';

export type ProposalStatus = 'open' | 'integrated' | 'declined';

export type ProposalMutation =
  | {
      readonly kind: 'append-state';
      readonly contentTypeId: ContentTypeId;
      readonly payload: unknown;
    }
  | {
      readonly kind: 'compose';
      readonly childId: OrganismId;
      readonly position?: number;
    }
  | {
      readonly kind: 'decompose';
      readonly childId: OrganismId;
    }
  | {
      readonly kind: 'change-visibility';
      readonly level: VisibilityLevel;
    };

export interface LegacyProposalFields {
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
}

export interface Proposal {
  readonly id: ProposalId;
  readonly organismId: OrganismId;
  readonly mutation: ProposalMutation;
  /**
   * Backward-compatible projection of proposal mutation for existing
   * clients, UI labels, and differ paths still keyed on content type.
   */
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
  readonly description?: string;
  readonly proposedBy: UserId;
  readonly status: ProposalStatus;
  readonly createdAt: Timestamp;
  readonly resolvedAt?: Timestamp;
  readonly resolvedBy?: UserId;
  readonly declineReason?: string;
}

export interface EncodedProposalMutation {
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
}

const COMPOSE_MUTATION_TYPE_ID = '__mutation.compose';
const DECOMPOSE_MUTATION_TYPE_ID = '__mutation.decompose';
const CHANGE_VISIBILITY_MUTATION_TYPE_ID = '__mutation.change-visibility';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function toLegacyProposalFields(mutation: ProposalMutation): LegacyProposalFields {
  switch (mutation.kind) {
    case 'append-state':
      return {
        proposedContentTypeId: mutation.contentTypeId,
        proposedPayload: mutation.payload,
      };
    case 'compose':
      return {
        proposedContentTypeId: 'composition',
        proposedPayload: {
          kind: mutation.kind,
          childId: mutation.childId,
          position: mutation.position,
        },
      };
    case 'decompose':
      return {
        proposedContentTypeId: 'composition',
        proposedPayload: {
          kind: mutation.kind,
          childId: mutation.childId,
        },
      };
    case 'change-visibility':
      return {
        proposedContentTypeId: 'visibility',
        proposedPayload: {
          kind: mutation.kind,
          level: mutation.level,
        },
      };
  }
}

export function encodeProposalMutation(mutation: ProposalMutation): EncodedProposalMutation {
  switch (mutation.kind) {
    case 'append-state':
      return {
        proposedContentTypeId: mutation.contentTypeId,
        proposedPayload: mutation.payload,
      };
    case 'compose':
      return {
        proposedContentTypeId: COMPOSE_MUTATION_TYPE_ID,
        proposedPayload: {
          childId: mutation.childId,
          position: mutation.position,
        },
      };
    case 'decompose':
      return {
        proposedContentTypeId: DECOMPOSE_MUTATION_TYPE_ID,
        proposedPayload: {
          childId: mutation.childId,
        },
      };
    case 'change-visibility':
      return {
        proposedContentTypeId: CHANGE_VISIBILITY_MUTATION_TYPE_ID,
        proposedPayload: {
          level: mutation.level,
        },
      };
  }
}

export function decodeProposalMutation(encoded: EncodedProposalMutation): ProposalMutation {
  if (encoded.proposedContentTypeId === COMPOSE_MUTATION_TYPE_ID) {
    const payload = asRecord(encoded.proposedPayload);
    const childId = payload?.childId;
    if (typeof childId !== 'string' || childId.length === 0) {
      // Fall back to append-state for malformed legacy data resilience.
      return {
        kind: 'append-state',
        contentTypeId: encoded.proposedContentTypeId as ContentTypeId,
        payload: encoded.proposedPayload,
      };
    }
    const position = payload?.position;
    return {
      kind: 'compose',
      childId: childId as OrganismId,
      position: typeof position === 'number' ? position : undefined,
    };
  }

  if (encoded.proposedContentTypeId === DECOMPOSE_MUTATION_TYPE_ID) {
    const payload = asRecord(encoded.proposedPayload);
    const childId = payload?.childId;
    if (typeof childId !== 'string' || childId.length === 0) {
      return {
        kind: 'append-state',
        contentTypeId: encoded.proposedContentTypeId as ContentTypeId,
        payload: encoded.proposedPayload,
      };
    }
    return {
      kind: 'decompose',
      childId: childId as OrganismId,
    };
  }

  if (encoded.proposedContentTypeId === CHANGE_VISIBILITY_MUTATION_TYPE_ID) {
    const payload = asRecord(encoded.proposedPayload);
    const level = payload?.level;
    if (level === 'public' || level === 'members' || level === 'private') {
      return {
        kind: 'change-visibility',
        level,
      };
    }
    return {
      kind: 'append-state',
      contentTypeId: encoded.proposedContentTypeId as ContentTypeId,
      payload: encoded.proposedPayload,
    };
  }

  return {
    kind: 'append-state',
    contentTypeId: encoded.proposedContentTypeId as ContentTypeId,
    payload: encoded.proposedPayload,
  };
}
