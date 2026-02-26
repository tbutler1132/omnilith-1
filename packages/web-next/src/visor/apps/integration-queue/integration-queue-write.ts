/**
 * Integration Queue write helpers.
 *
 * Encapsulates integrate and decline proposal mutations so queue actions remain
 * deterministic and isolated from app rendering concerns.
 */

import type { DeclineProposalResponse, IntegrateProposalResponse } from '@omnilith/api-contracts';
import { apiFetch } from '../../../api/api-client.js';

export function integrateQueueProposal(proposalId: string): Promise<IntegrateProposalResponse> {
  return apiFetch<IntegrateProposalResponse>(`/proposals/${proposalId}/integrate`, {
    method: 'POST',
  });
}

export function declineQueueProposal(proposalId: string): Promise<DeclineProposalResponse> {
  return apiFetch<DeclineProposalResponse>(`/proposals/${proposalId}/decline`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
