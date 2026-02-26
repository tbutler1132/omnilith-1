/**
 * Organism View presenter.
 *
 * Keeps read-only universal layer formatting deterministic and easy to test so
 * rendering can stay focused on layout.
 */

import type { OrganismState } from '@omnilith/api-contracts';
import { ApiError } from '../../../api/api-client.js';

export type OrganismViewStatus = 'loading' | 'auth-required' | 'error' | 'empty' | 'ready';

export interface PresentOrganismViewStatusInput {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hasOrganism: boolean;
}

export interface PresentOrganismViewStatusResult {
  readonly status: OrganismViewStatus;
  readonly message: string;
}

export interface PresentStateHistoryInput {
  readonly states: ReadonlyArray<OrganismState>;
  readonly visibleCount: number;
}

export interface PresentedStateHistoryEntry {
  readonly sequenceNumber: number;
  readonly contentTypeId: string;
  readonly createdAtLabel: string;
  readonly payloadPreview: string;
}

export interface PresentStateHistoryResult {
  readonly entries: ReadonlyArray<PresentedStateHistoryEntry>;
  readonly hasMore: boolean;
}

const FALLBACK_TIMESTAMP_LABEL = 'Unknown time';

function isAuthRequiredError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 401 || error.status === 403;
}

export function presentOrganismViewStatus(input: PresentOrganismViewStatusInput): PresentOrganismViewStatusResult {
  if (input.loading) {
    return {
      status: 'loading',
      message: 'Loading organism view...',
    };
  }

  if (isAuthRequiredError(input.error)) {
    return {
      status: 'auth-required',
      message: 'Log in to inspect this organism.',
    };
  }

  if (input.error) {
    return {
      status: 'error',
      message: input.error.message ?? 'Failed to load organism view.',
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

export function presentStateHistory(input: PresentStateHistoryInput): PresentStateHistoryResult {
  const sorted = [...input.states].sort((a, b) => b.sequenceNumber - a.sequenceNumber);
  const limited = sorted.slice(0, Math.max(0, input.visibleCount));

  return {
    entries: limited.map((state) => ({
      sequenceNumber: state.sequenceNumber,
      contentTypeId: state.contentTypeId,
      createdAtLabel: formatTimestamp(state.createdAt),
      payloadPreview: createPayloadPreview(state.payload),
    })),
    hasMore: sorted.length > limited.length,
  };
}

export function formatTimestamp(value: number | undefined): string {
  if (!value || !Number.isFinite(value)) {
    return FALLBACK_TIMESTAMP_LABEL;
  }

  return new Date(value).toLocaleString();
}

function createPayloadPreview(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return 'No payload';
  }

  if (typeof payload === 'string') {
    return truncate(payload.trim(), 120);
  }

  if (typeof payload !== 'object') {
    return truncate(String(payload), 120);
  }

  try {
    const keys = Object.keys(payload as Record<string, unknown>);
    if (keys.length === 0) {
      return '{}';
    }

    return truncate(keys.slice(0, 4).join(', '), 120);
  } catch {
    return 'Uninspectable payload';
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}
