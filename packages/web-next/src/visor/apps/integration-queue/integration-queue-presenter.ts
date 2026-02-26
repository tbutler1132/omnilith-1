/**
 * Integration Queue presenter.
 *
 * Normalizes queue status, sorting, filtering, and compare context so the app
 * can focus on rendering and decision interaction.
 */

import type { Proposal, ProposalMutation } from '@omnilith/api-contracts';
import { ApiError } from '../../../api/api-client.js';
import type { IntegrationQueueStatusFilter } from './integration-queue-app-route.js';

export type IntegrationQueueStatus = 'loading' | 'auth-required' | 'error' | 'empty' | 'ready';

export interface PresentIntegrationQueueStatusInput {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hasOrganism: boolean;
}

export interface PresentIntegrationQueueStatusResult {
  readonly status: IntegrationQueueStatus;
  readonly message: string;
}

export interface PresentIntegrationQueueListInput {
  readonly proposals: ReadonlyArray<Proposal>;
  readonly statusFilter: IntegrationQueueStatusFilter;
}

export interface PresentedIntegrationQueueEntry {
  readonly id: string;
  readonly status: Proposal['status'];
  readonly summary: string;
  readonly proposedBy: string;
  readonly createdAtLabel: string;
  readonly proposal: Proposal;
}

export interface PresentIntegrationQueueListResult {
  readonly entries: ReadonlyArray<PresentedIntegrationQueueEntry>;
  readonly openCount: number;
  readonly totalCount: number;
}

export interface ResolveProposalCompareInput {
  readonly proposal: Proposal;
  readonly currentStatePayload: unknown;
  readonly currentStateContentTypeId: string | null;
}

export interface ResolveProposalCompareResult {
  readonly mutationKind: ProposalMutation['kind'];
  readonly contentTypeId: string | null;
  readonly beforePayload: unknown;
  readonly proposedPayload: unknown;
}

export interface ResolveNextOpenProposalIdInput {
  readonly proposals: ReadonlyArray<Proposal>;
}

function isAuthRequiredError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return error.status === 401 || error.status === 403;
}

export function presentIntegrationQueueStatus(
  input: PresentIntegrationQueueStatusInput,
): PresentIntegrationQueueStatusResult {
  if (input.loading) {
    return {
      status: 'loading',
      message: 'Loading integration queue...',
    };
  }

  if (isAuthRequiredError(input.error)) {
    return {
      status: 'auth-required',
      message: 'Log in to work integration decisions for this organism.',
    };
  }

  if (input.error) {
    return {
      status: 'error',
      message: input.error.message ?? 'Failed to load integration queue.',
    };
  }

  if (!input.hasOrganism) {
    return {
      status: 'empty',
      message: 'No organism is available in this boundary context.',
    };
  }

  return {
    status: 'ready',
    message: '',
  };
}

export function presentIntegrationQueueList(
  input: PresentIntegrationQueueListInput,
): PresentIntegrationQueueListResult {
  const sorted = sortProposalsNewestFirst(input.proposals);
  const openCount = sorted.filter((proposal) => proposal.status === 'open').length;
  const filtered = input.statusFilter === 'open' ? sorted.filter((proposal) => proposal.status === 'open') : sorted;

  return {
    entries: filtered.map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      summary: presentMutationSummary(proposal),
      proposedBy: proposal.proposedBy,
      createdAtLabel: formatTimestamp(proposal.createdAt),
      proposal,
    })),
    openCount,
    totalCount: sorted.length,
  };
}

export function resolveNextOpenProposalId(input: ResolveNextOpenProposalIdInput): string | null {
  const nextOpenProposal = sortProposalsNewestFirst(input.proposals).find((proposal) => proposal.status === 'open');
  return nextOpenProposal?.id ?? null;
}

export function presentMutationSummary(proposal: Proposal): string {
  switch (proposal.mutation.kind) {
    case 'append-state':
      return `append-state · ${proposal.mutation.contentTypeId ?? proposal.proposedContentTypeId}`;
    case 'compose':
      return `compose · child ${proposal.mutation.childId ?? 'unknown'}`;
    case 'decompose':
      return `decompose · child ${proposal.mutation.childId ?? 'unknown'}`;
    case 'change-visibility':
      return `change-visibility · ${proposal.mutation.level ?? 'unknown'}`;
  }
}

export function resolveProposalCompare(input: ResolveProposalCompareInput): ResolveProposalCompareResult {
  const { proposal } = input;

  if (proposal.mutation.kind === 'append-state') {
    const proposedPayload =
      proposal.mutation.payload !== undefined ? proposal.mutation.payload : (proposal.proposedPayload ?? null);

    return {
      mutationKind: proposal.mutation.kind,
      contentTypeId:
        proposal.mutation.contentTypeId ?? proposal.proposedContentTypeId ?? input.currentStateContentTypeId,
      beforePayload: input.currentStatePayload,
      proposedPayload,
    };
  }

  return {
    mutationKind: proposal.mutation.kind,
    contentTypeId: input.currentStateContentTypeId,
    beforePayload: input.currentStatePayload,
    proposedPayload: {
      mutation: proposal.mutation,
      proposedContentTypeId: proposal.proposedContentTypeId,
      proposedPayload: proposal.proposedPayload,
      description: proposal.description ?? null,
    },
  };
}

function sortProposalsNewestFirst(proposals: ReadonlyArray<Proposal>): Array<Proposal> {
  return [...proposals].sort((a, b) => b.createdAt - a.createdAt);
}

export function formatTimestamp(value: number | undefined): string {
  if (!value || !Number.isFinite(value)) {
    return 'Unknown time';
  }

  return new Date(value).toLocaleString();
}
