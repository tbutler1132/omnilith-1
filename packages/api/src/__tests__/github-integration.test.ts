import type { ContentTypeId, OrganismId, Proposal, ProposalId, Timestamp, UserId } from '@omnilith/kernel';
import { describe, expect, it } from 'vitest';
import { isRepositoryAllowed, parseGitHubAllowlist } from '../github/allowlist.js';
import { buildIssueDraftFromProposal } from '../github/issue-draft.js';
import { buildProposalMarker } from '../github/proposal-marker.js';

function createProposal(partial?: Partial<Proposal>): Proposal {
  return {
    id: 'prp-1' as ProposalId,
    organismId: 'org-1' as OrganismId,
    mutation: {
      kind: 'append-state',
      contentTypeId: 'text' as ContentTypeId,
      payload: { content: 'hello' },
    },
    proposedContentTypeId: 'text',
    proposedPayload: { content: 'hello' },
    description: 'Refine issue routing',
    proposedBy: 'usr-1' as UserId,
    status: 'integrated',
    createdAt: 1 as Timestamp,
    resolvedAt: 2 as Timestamp,
    resolvedBy: 'usr-2' as UserId,
    ...partial,
  };
}

describe('github allowlist', () => {
  it('parses and normalizes repository entries', () => {
    const allowlist = parseGitHubAllowlist('Omnilith-Labs/Omnilith, owner/two');

    expect(isRepositoryAllowed(allowlist, { owner: 'omnilith-labs', name: 'omnilith' })).toBe(true);
    expect(isRepositoryAllowed(allowlist, { owner: 'OWNER', name: 'TWO' })).toBe(true);
    expect(isRepositoryAllowed(allowlist, { owner: 'other', name: 'repo' })).toBe(false);
  });

  it('denies all repositories when allowlist is empty', () => {
    const allowlist = parseGitHubAllowlist(undefined);
    expect(isRepositoryAllowed(allowlist, { owner: 'omnilith-labs', name: 'omnilith' })).toBe(false);
  });
});

describe('issue draft builder', () => {
  it('builds deterministic title/body including proposal marker', () => {
    const proposal = createProposal();
    const draft = buildIssueDraftFromProposal({ proposal });

    expect(draft.title).toContain('[Omnilith]');
    expect(draft.body).toContain(`proposalId: ${proposal.id}`);
    expect(draft.body).toContain(buildProposalMarker(proposal.id));
  });

  it('falls back to generic title when summary is unavailable', () => {
    const proposal = createProposal({
      mutation: {
        kind: 'change-visibility',
        level: 'private',
      },
      description: undefined,
    });

    const draft = buildIssueDraftFromProposal({ proposal });
    expect(draft.title).toContain('[Omnilith]');
    expect(draft.body).toContain('No additional proposal description was provided.');
  });
});
