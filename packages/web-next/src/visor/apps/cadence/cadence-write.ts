/**
 * Cadence write helpers.
 *
 * Centralizes editability checks and governance-aware mutation dispatch so the
 * cadence app can append state for open-trunk organisms and open proposals for
 * regulated organisms without duplicating request-shape logic.
 */

import { apiFetch } from '../../../api/api-client.js';

type TextPayloadRecord = {
  readonly content: string;
} & Record<string, unknown>;

interface AppendStateResponse {
  readonly state: {
    readonly id: string;
  };
}

interface OpenProposalResponse {
  readonly proposal: {
    readonly id: string;
  };
}

export interface CadenceWriteChild {
  readonly childId: string;
  readonly name: string;
  readonly openTrunk: boolean;
  readonly contentTypeId: string | null;
  readonly payload: unknown;
}

export type CadenceWriteOutcome = 'append-state' | 'open-proposal';

export function getCadenceTextPayload(payload: unknown): TextPayloadRecord | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeContent = (payload as { content?: unknown }).content;
  if (typeof maybeContent !== 'string') {
    return null;
  }

  return payload as TextPayloadRecord;
}

export function canEditCadenceChild(child: Pick<CadenceWriteChild, 'contentTypeId' | 'payload'>): boolean {
  if (child.contentTypeId !== 'text') {
    return false;
  }

  return getCadenceTextPayload(child.payload) !== null;
}

export function buildCadenceUpdatedPayload(payload: unknown, nextContent: string): Record<string, unknown> {
  const current = getCadenceTextPayload(payload);
  if (!current) {
    throw new Error('Cadence child payload is not editable text content.');
  }

  return {
    ...current,
    content: nextContent,
  };
}

export async function saveCadenceChildDraft(
  child: CadenceWriteChild,
  nextContent: string,
): Promise<CadenceWriteOutcome> {
  const payload = buildCadenceUpdatedPayload(child.payload, nextContent);

  if (child.openTrunk) {
    await apiFetch<AppendStateResponse>(`/organisms/${child.childId}/states`, {
      method: 'POST',
      body: JSON.stringify({
        contentTypeId: 'text',
        payload,
      }),
    });

    return 'append-state';
  }

  await apiFetch<OpenProposalResponse>(`/organisms/${child.childId}/proposals`, {
    method: 'POST',
    body: JSON.stringify({
      mutation: {
        kind: 'append-state',
        contentTypeId: 'text',
        payload,
      },
      description: `Cadence update for ${child.name}.`,
    }),
  });

  return 'open-proposal';
}
