/**
 * Text editor write helpers.
 *
 * Centralizes payload guards and governance-aware mutation dispatch so the
 * text editor app can append state for open-trunk organisms and open
 * proposals for regulated organisms without duplicating request-shape logic.
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

export interface TextEditorTarget {
  readonly organismId: string;
  readonly organismName: string;
  readonly openTrunk: boolean;
  readonly contentTypeId: string | null;
  readonly payload: unknown;
}

export interface SaveTextEditorDraftInput {
  readonly target: TextEditorTarget;
  readonly nextContent: string;
}

export type TextEditorWriteOutcome = 'append-state' | 'open-proposal';

export function getTextEditorPayload(payload: unknown): TextPayloadRecord | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeContent = (payload as { content?: unknown }).content;
  if (typeof maybeContent !== 'string') {
    return null;
  }

  return payload as TextPayloadRecord;
}

export function canEditTextEditorTarget(target: Pick<TextEditorTarget, 'contentTypeId' | 'payload'>): boolean {
  if (target.contentTypeId !== 'text') {
    return false;
  }

  return getTextEditorPayload(target.payload) !== null;
}

export function buildTextEditorUpdatedPayload(payload: unknown, nextContent: string): Record<string, unknown> {
  const current = getTextEditorPayload(payload);
  if (!current) {
    throw new Error('Text editor target payload is not editable text content.');
  }

  return {
    ...current,
    content: nextContent,
  };
}

export async function saveTextEditorDraft(input: SaveTextEditorDraftInput): Promise<TextEditorWriteOutcome> {
  if (!canEditTextEditorTarget(input.target)) {
    throw new Error('Text editor target is not editable.');
  }

  const payload = buildTextEditorUpdatedPayload(input.target.payload, input.nextContent);

  if (input.target.openTrunk) {
    await apiFetch<AppendStateResponse>(`/organisms/${input.target.organismId}/states`, {
      method: 'POST',
      body: JSON.stringify({
        contentTypeId: 'text',
        payload,
      }),
    });

    return 'append-state';
  }

  await apiFetch<OpenProposalResponse>(`/organisms/${input.target.organismId}/proposals`, {
    method: 'POST',
    body: JSON.stringify({
      mutation: {
        kind: 'append-state',
        contentTypeId: 'text',
        payload,
      },
      description: `Text editor update for ${input.target.organismName}.`,
    }),
  });

  return 'open-proposal';
}
