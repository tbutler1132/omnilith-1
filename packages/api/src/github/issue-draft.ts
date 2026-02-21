/**
 * GitHub issue draft builder from integrated proposals.
 *
 * Converts integrated proposal context into a deterministic issue title
 * and body that preserve traceability back to organism governance.
 */

import type { OrganismId, Proposal, ProposalId } from '@omnilith/kernel';
import { buildProposalMarker } from './proposal-marker.js';

interface IssueDraftInput {
  readonly proposal: Proposal;
}

export interface IssueDraft {
  readonly title: string;
  readonly body: string;
}

function summarizeMutation(proposal: Proposal): string {
  switch (proposal.mutation.kind) {
    case 'append-state': {
      const payload = proposal.mutation.payload as Record<string, unknown> | null;
      const payloadTitle = payload && typeof payload.title === 'string' ? payload.title.trim() : '';
      if (payloadTitle.length > 0) {
        return payloadTitle;
      }
      return `append-state:${proposal.mutation.contentTypeId}`;
    }
    case 'compose':
      return `compose:${proposal.mutation.childId}`;
    case 'decompose':
      return `decompose:${proposal.mutation.childId}`;
    case 'change-visibility':
      return `change-visibility:${proposal.mutation.level}`;
  }
}

function buildTitle(proposalId: ProposalId, organismId: OrganismId, summary: string): string {
  const normalized = summary.trim();
  if (normalized.length === 0) {
    return `[Omnilith] Proposal ${proposalId}`;
  }

  const candidate = `[Omnilith] ${normalized}`;
  if (candidate.length <= 120) {
    return candidate;
  }

  const organismSuffix = ` (${organismId})`;
  const maxSummaryLength = Math.max(16, 120 - '[Omnilith] ...'.length - organismSuffix.length);
  return `[Omnilith] ${normalized.slice(0, maxSummaryLength)}...${organismSuffix}`;
}

function sanitizeDescription(description: string | undefined): string {
  if (!description) {
    return 'No additional proposal description was provided.';
  }

  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : 'No additional proposal description was provided.';
}

export function buildIssueDraftFromProposal(input: IssueDraftInput): IssueDraft {
  const { proposal } = input;
  const summary = summarizeMutation(proposal);
  const title = buildTitle(proposal.id, proposal.organismId, summary);
  const marker = buildProposalMarker(proposal.id);

  const bodyLines = [
    'Omnilith integrated proposal trigger.',
    '',
    '## Source Trace',
    `- proposalId: ${proposal.id}`,
    `- organismId: ${proposal.organismId}`,
    `- mutationKind: ${proposal.mutation.kind}`,
    `- integratedAt: ${proposal.resolvedAt ?? 'unknown'}`,
    '',
    '## Proposal Description',
    sanitizeDescription(proposal.description),
    '',
    '## Idempotency Marker',
    marker,
  ];

  return {
    title,
    body: bodyLines.join('\n'),
  };
}
