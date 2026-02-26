import type { Proposal } from '@omnilith/api-contracts';
import { describe, expect, it } from 'vitest';
import {
  presentIntegrationQueueList,
  presentIntegrationQueueStatus,
  presentMutationSummary,
  resolveNextOpenProposalId,
  resolveProposalCompare,
} from './integration-queue-presenter.js';

function createProposal(input: {
  id: string;
  status?: Proposal['status'];
  createdAt?: number;
  mutation?: Proposal['mutation'];
  proposedContentTypeId?: string;
  proposedPayload?: unknown;
}): Proposal {
  return {
    id: input.id,
    organismId: 'org-1',
    mutation:
      input.mutation ??
      ({
        kind: 'append-state',
        contentTypeId: 'text',
        payload: { content: `proposal-${input.id}` },
      } satisfies Proposal['mutation']),
    proposedContentTypeId: input.proposedContentTypeId ?? 'text',
    proposedPayload: input.proposedPayload ?? { content: `proposal-${input.id}` },
    proposedBy: 'user-1',
    status: input.status ?? 'open',
    createdAt: input.createdAt ?? Date.now(),
  };
}

describe('presentIntegrationQueueStatus', () => {
  it('returns loading while queue is loading', () => {
    expect(
      presentIntegrationQueueStatus({
        loading: true,
        error: null,
        hasOrganism: false,
      }),
    ).toEqual({
      status: 'loading',
      message: 'Loading integration queue...',
    });
  });

  it('returns ready when organism context exists', () => {
    expect(
      presentIntegrationQueueStatus({
        loading: false,
        error: null,
        hasOrganism: true,
      }),
    ).toEqual({
      status: 'ready',
      message: '',
    });
  });
});

describe('presentIntegrationQueueList', () => {
  it('filters to open proposals and sorts newest first', () => {
    const first = createProposal({ id: 'proposal-1', createdAt: 1000, status: 'open' });
    const second = createProposal({ id: 'proposal-2', createdAt: 3000, status: 'declined' });
    const third = createProposal({ id: 'proposal-3', createdAt: 2000, status: 'open' });

    const result = presentIntegrationQueueList({
      proposals: [first, second, third],
      statusFilter: 'open',
    });

    expect(result.entries.map((entry) => entry.id)).toEqual(['proposal-3', 'proposal-1']);
    expect(result.openCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it('shows all statuses when all filter is selected', () => {
    const result = presentIntegrationQueueList({
      proposals: [
        createProposal({ id: 'proposal-1', status: 'open', createdAt: 1000 }),
        createProposal({ id: 'proposal-2', status: 'integrated', createdAt: 3000 }),
      ],
      statusFilter: 'all',
    });

    expect(result.entries.map((entry) => entry.status)).toEqual(['integrated', 'open']);
  });
});

describe('resolveNextOpenProposalId', () => {
  it('returns the newest open proposal after sorting', () => {
    const nextOpen = resolveNextOpenProposalId({
      proposals: [
        createProposal({ id: 'proposal-1', status: 'open', createdAt: 1000 }),
        createProposal({ id: 'proposal-2', status: 'integrated', createdAt: 3000 }),
        createProposal({ id: 'proposal-3', status: 'open', createdAt: 2000 }),
      ],
    });

    expect(nextOpen).toBe('proposal-3');
  });

  it('returns null when no open proposals remain', () => {
    const nextOpen = resolveNextOpenProposalId({
      proposals: [createProposal({ id: 'proposal-2', status: 'declined', createdAt: 3000 })],
    });

    expect(nextOpen).toBeNull();
  });
});

describe('presentMutationSummary', () => {
  it('summarizes compose mutations', () => {
    const proposal = createProposal({
      id: 'proposal-compose',
      mutation: {
        kind: 'compose',
        childId: 'child-7',
      },
    });

    expect(presentMutationSummary(proposal)).toContain('compose');
    expect(presentMutationSummary(proposal)).toContain('child-7');
  });
});

describe('resolveProposalCompare', () => {
  it('uses append-state payload as proposed side when available', () => {
    const proposal = createProposal({
      id: 'proposal-append',
      mutation: {
        kind: 'append-state',
        contentTypeId: 'text',
        payload: { content: 'proposed change' },
      },
    });

    const compare = resolveProposalCompare({
      proposal,
      currentStatePayload: { content: 'before change' },
      currentStateContentTypeId: 'text',
    });

    expect(compare.contentTypeId).toBe('text');
    expect(compare.beforePayload).toEqual({ content: 'before change' });
    expect(compare.proposedPayload).toEqual({ content: 'proposed change' });
  });

  it('builds structured proposed payload for non-append mutations', () => {
    const proposal = createProposal({
      id: 'proposal-compose',
      mutation: {
        kind: 'compose',
        childId: 'child-9',
      },
    });

    const compare = resolveProposalCompare({
      proposal,
      currentStatePayload: { content: 'before' },
      currentStateContentTypeId: 'text',
    });

    expect(compare.mutationKind).toBe('compose');
    expect(compare.proposedPayload).toEqual(
      expect.objectContaining({
        mutation: {
          kind: 'compose',
          childId: 'child-9',
        },
      }),
    );
  });
});
