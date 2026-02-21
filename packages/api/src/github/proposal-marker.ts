/**
 * Proposal marker helpers for GitHub issue idempotency.
 *
 * Every generated issue body carries a deterministic marker so retries
 * can search for pre-existing issues instead of creating duplicates.
 */

import type { ProposalId } from '@omnilith/kernel';

const PROPOSAL_MARKER_PREFIX = 'omnilith-proposal-id';

export function buildProposalMarker(proposalId: ProposalId): string {
  return `${PROPOSAL_MARKER_PREFIX}: ${proposalId}`;
}
