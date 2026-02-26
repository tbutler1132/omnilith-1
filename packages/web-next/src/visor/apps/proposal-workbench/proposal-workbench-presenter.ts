/**
 * Proposal Workbench presenter.
 *
 * Normalizes proposal list/filter/comparison state into deterministic view
 * models so the app component can stay focused on rendering.
 */

import type { Proposal, ProposalMutation } from '@omnilith/api-contracts';
import { ApiError } from '../../../api/api-client.js';
import type { ProposalWorkbenchStatusFilter } from './proposal-workbench-app-route.js';

export type ProposalWorkbenchStatus = 'loading' | 'auth-required' | 'error' | 'empty' | 'ready';

export interface PresentProposalWorkbenchStatusInput {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hasOrganism: boolean;
}

export interface PresentProposalWorkbenchStatusResult {
  readonly status: ProposalWorkbenchStatus;
  readonly message: string;
}

export interface PresentProposalListInput {
  readonly proposals: ReadonlyArray<Proposal>;
  readonly statusFilter: ProposalWorkbenchStatusFilter;
}

export interface PresentedProposalListEntry {
  readonly id: string;
  readonly status: Proposal['status'];
  readonly summary: string;
  readonly proposedBy: string;
  readonly createdAtLabel: string;
  readonly proposal: Proposal;
}

export interface PresentProposalListResult {
  readonly entries: ReadonlyArray<PresentedProposalListEntry>;
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

function isAuthRequiredError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 401 || error.status === 403;
}

export function presentProposalWorkbenchStatus(
  input: PresentProposalWorkbenchStatusInput,
): PresentProposalWorkbenchStatusResult {
  if (input.loading) {
    return {
      status: 'loading',
      message: 'Loading proposal workbench...',
    };
  }

  if (isAuthRequiredError(input.error)) {
    return {
      status: 'auth-required',
      message: 'Log in to inspect proposals for this organism.',
    };
  }

  if (input.error) {
    return {
      status: 'error',
      message: input.error.message ?? 'Failed to load proposal workbench.',
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

export function presentProposalList(input: PresentProposalListInput): PresentProposalListResult {
  const sorted = [...input.proposals].sort((a, b) => b.createdAt - a.createdAt);
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

export function stringifyPayload(payload: unknown): string {
  try {
    const json = JSON.stringify(payload, null, 2);
    if (json === undefined) {
      return 'No payload';
    }

    return json;
  } catch {
    return 'Unable to render payload as JSON.';
  }
}

export function formatTimestamp(value: number | undefined): string {
  if (!value || !Number.isFinite(value)) {
    return 'Unknown time';
  }

  return new Date(value).toLocaleString();
}
