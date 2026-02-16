/**
 * Organism API functions — typed wrappers for organism endpoints.
 *
 * Domain types and contract types come from @omnilith/kernel so the
 * frontend and backend share a single source of truth for request
 * and response shapes.
 */

import type {
  AppendStateRequest,
  AppendStateResponse,
  ComposeChildRequest,
  ComposeChildResponse,
  DeclineProposalRequest,
  DeclineProposalResponse,
  DecomposeChildResponse,
  FetchChildrenResponse,
  FetchEventsResponse,
  FetchOrganismResponse,
  FetchOrganismsResponse,
  FetchParentResponse,
  FetchProposalsResponse,
  FetchRelationshipsResponse,
  FetchStateHistoryResponse,
  FetchUserOrganismsResponse,
  FetchUserProposalsResponse,
  FetchVitalityResponse,
  FetchWorldMapResponse,
  InstantiateTemplateResponse,
  IntegrateProposalResponse,
  OpenProposalRequest,
  OpenProposalResponse,
  ThresholdOrganismRequest,
  ThresholdOrganismResponse,
} from '@omnilith/kernel';
import { apiFetch } from './client.js';

interface InstantiateTemplateStepOverride {
  readonly name?: string;
  readonly initialPayload?: unknown;
  readonly openTrunk?: boolean;
}

interface InstantiateTemplateRequest {
  readonly overrides?: Readonly<Record<string, InstantiateTemplateStepOverride>>;
}

export function fetchOrganisms(filters?: { contentTypeId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.contentTypeId) params.set('contentTypeId', filters.contentTypeId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiFetch<FetchOrganismsResponse>(`/organisms${qs ? `?${qs}` : ''}`);
}

export function fetchOrganism(id: string) {
  return apiFetch<FetchOrganismResponse>(`/organisms/${id}`);
}

export function fetchStateHistory(id: string) {
  return apiFetch<FetchStateHistoryResponse>(`/organisms/${id}/states`);
}

export function fetchChildren(id: string) {
  return apiFetch<FetchChildrenResponse>(`/organisms/${id}/children`);
}

export function fetchParent(id: string) {
  return apiFetch<FetchParentResponse>(`/organisms/${id}/parent`);
}

export function fetchVitality(id: string) {
  return apiFetch<FetchVitalityResponse>(`/organisms/${id}/vitality`);
}

export function fetchProposals(id: string) {
  return apiFetch<FetchProposalsResponse>(`/organisms/${id}/proposals`);
}

export function fetchRelationships(id: string) {
  return apiFetch<FetchRelationshipsResponse>(`/organisms/${id}/relationships`);
}

export function fetchEvents(id: string) {
  return apiFetch<FetchEventsResponse>(`/organisms/${id}/events`);
}

export function thresholdOrganism(input: ThresholdOrganismRequest) {
  return apiFetch<ThresholdOrganismResponse>('/organisms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function composeChild(parentId: string, childId: string, position?: number) {
  const body: ComposeChildRequest = { childId, position };
  return apiFetch<ComposeChildResponse>(`/organisms/${parentId}/children`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function decomposeChild(parentId: string, childId: string) {
  return apiFetch<DecomposeChildResponse>(`/organisms/${parentId}/children/${childId}`, {
    method: 'DELETE',
  });
}

export function fetchWorldMap() {
  return apiFetch<FetchWorldMapResponse>('/platform/world-map');
}

export function fetchUserOrganisms() {
  return apiFetch<FetchUserOrganismsResponse>('/users/me/organisms');
}

export function fetchUserProposals() {
  return apiFetch<FetchUserProposalsResponse>('/users/me/proposals');
}

export function instantiateTemplate(templateId: string, input?: InstantiateTemplateRequest) {
  return apiFetch<InstantiateTemplateResponse>(`/templates/${templateId}/instantiate`, {
    method: 'POST',
    body: input ? JSON.stringify(input) : undefined,
  });
}

export function appendState(organismId: string, contentTypeId: string, payload: unknown) {
  const body: AppendStateRequest = { contentTypeId, payload };
  return apiFetch<AppendStateResponse>(`/organisms/${organismId}/states`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function openProposal(organismId: string, contentTypeId: string, payload: unknown) {
  const body: OpenProposalRequest = { proposedContentTypeId: contentTypeId, proposedPayload: payload };
  return apiFetch<OpenProposalResponse>(`/organisms/${organismId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function integrateProposal(proposalId: string) {
  return apiFetch<IntegrateProposalResponse>(`/proposals/${proposalId}/integrate`, {
    method: 'POST',
  });
}

export function declineProposal(proposalId: string, reason?: string) {
  const body: DeclineProposalRequest = { reason };
  return apiFetch<DeclineProposalResponse>(`/proposals/${proposalId}/decline`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
