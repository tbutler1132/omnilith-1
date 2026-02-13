/**
 * Organism API functions — typed wrappers for organism endpoints.
 */

import { apiFetch } from './client.js';

export interface Organism {
  id: string;
  createdAt: number;
  createdBy: string;
  openTrunk: boolean;
  forkedFromId?: string;
}

export interface OrganismState {
  id: string;
  organismId: string;
  contentTypeId: string;
  payload: unknown;
  createdAt: number;
  createdBy: string;
  sequenceNumber: number;
  parentStateId?: string;
}

export interface OrganismWithState {
  organism: Organism;
  currentState: OrganismState | undefined;
}

export interface CompositionRecord {
  parentId: string;
  childId: string;
  composedAt: number;
  composedBy: string;
  position?: number;
}

export interface VitalityData {
  organismId: string;
  recentStateChanges: number;
  openProposalCount: number;
  lastActivityAt?: number;
}

export interface Proposal {
  id: string;
  organismId: string;
  proposedContentTypeId: string;
  proposedPayload: unknown;
  proposedBy: string;
  status: 'open' | 'integrated' | 'declined';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  declineReason?: string;
}

export interface Relationship {
  id: string;
  type: 'membership' | 'integration-authority' | 'stewardship';
  userId: string;
  organismId: string;
  role?: 'founder' | 'member';
  createdAt: number;
}

export interface DomainEvent {
  id: string;
  type: string;
  organismId: string;
  actorId: string;
  occurredAt: number;
  payload: Record<string, unknown>;
}

export function fetchOrganisms(filters?: { contentTypeId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.contentTypeId) params.set('contentTypeId', filters.contentTypeId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiFetch<{ organisms: OrganismWithState[] }>(`/organisms${qs ? `?${qs}` : ''}`);
}

export function fetchOrganism(id: string) {
  return apiFetch<{ organism: Organism; currentState: OrganismState | null }>(`/organisms/${id}`);
}

export function fetchStateHistory(id: string) {
  return apiFetch<{ states: OrganismState[] }>(`/organisms/${id}/states`);
}

export function fetchChildren(id: string) {
  return apiFetch<{ children: CompositionRecord[] }>(`/organisms/${id}/children`);
}

export function fetchParent(id: string) {
  return apiFetch<{ parent: CompositionRecord | null }>(`/organisms/${id}/parent`);
}

export function fetchVitality(id: string) {
  return apiFetch<{ vitality: VitalityData }>(`/organisms/${id}/vitality`);
}

export function fetchProposals(id: string) {
  return apiFetch<{ proposals: Proposal[] }>(`/organisms/${id}/proposals`);
}

export function fetchRelationships(id: string) {
  return apiFetch<{ relationships: Relationship[] }>(`/organisms/${id}/relationships`);
}

export function fetchEvents(id: string) {
  return apiFetch<{ events: DomainEvent[] }>(`/organisms/${id}/events`);
}

export function thresholdOrganism(input: { contentTypeId: string; payload: unknown; openTrunk?: boolean }) {
  return apiFetch<{ organism: Organism; initialState: OrganismState }>('/organisms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function composeChild(parentId: string, childId: string, position?: number) {
  return apiFetch<{ composition: CompositionRecord }>(`/organisms/${parentId}/children`, {
    method: 'POST',
    body: JSON.stringify({ childId, position }),
  });
}

export function decomposeChild(parentId: string, childId: string) {
  return apiFetch<{ ok: boolean }>(`/organisms/${parentId}/children/${childId}`, {
    method: 'DELETE',
  });
}

export function fetchWorldMap() {
  return apiFetch<{ worldMapId: string }>('/platform/world-map');
}

export function fetchUserOrganisms() {
  return apiFetch<{ organisms: OrganismWithState[] }>('/users/me/organisms');
}

export function fetchUserProposals() {
  return apiFetch<{ proposals: Proposal[] }>('/users/me/proposals');
}

export function instantiateTemplate(templateId: string) {
  return apiFetch<{ organism: Organism; initialState: OrganismState }>(`/templates/${templateId}/instantiate`, {
    method: 'POST',
  });
}

export function appendState(organismId: string, contentTypeId: string, payload: unknown) {
  return apiFetch<{ state: OrganismState }>(`/organisms/${organismId}/states`, {
    method: 'POST',
    body: JSON.stringify({ contentTypeId, payload }),
  });
}

export function openProposal(organismId: string, contentTypeId: string, payload: unknown) {
  return apiFetch<{ proposal: Proposal }>(`/organisms/${organismId}/proposals`, {
    method: 'POST',
    body: JSON.stringify({ contentTypeId, payload }),
  });
}

export function integrateProposal(proposalId: string) {
  return apiFetch<{ proposal: Proposal }>(`/proposals/${proposalId}/integrate`, {
    method: 'POST',
  });
}

export function declineProposal(proposalId: string, reason?: string) {
  return apiFetch<{ proposal: Proposal }>(`/proposals/${proposalId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
