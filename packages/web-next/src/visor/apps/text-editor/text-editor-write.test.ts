import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTextEditorUpdatedPayload,
  canEditTextEditorTarget,
  getTextEditorPayload,
  saveTextEditorDraft,
} from './text-editor-write.js';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../../../api/api-client.js', () => ({
  apiFetch: apiFetchMock,
}));

describe('text editor write helpers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('detects editable text targets', () => {
    expect(
      canEditTextEditorTarget({
        contentTypeId: 'text',
        payload: {
          content: 'hello',
          format: 'markdown',
        },
      }),
    ).toBe(true);

    expect(
      canEditTextEditorTarget({
        contentTypeId: 'sensor',
        payload: {
          content: 'hello',
        },
      }),
    ).toBe(false);

    expect(
      canEditTextEditorTarget({
        contentTypeId: 'text',
        payload: {
          body: 'hello',
        },
      }),
    ).toBe(false);
  });

  it('preserves payload fields while replacing text content', () => {
    const updated = buildTextEditorUpdatedPayload(
      {
        content: 'v1',
        format: 'markdown',
        metadata: {
          cadence: true,
        },
      },
      'v2',
    );

    expect(updated).toEqual({
      content: 'v2',
      format: 'markdown',
      metadata: {
        cadence: true,
      },
    });
  });

  it('returns null for non-text payloads', () => {
    expect(getTextEditorPayload(undefined)).toBeNull();
    expect(getTextEditorPayload({})).toBeNull();
  });

  it('appends state for open-trunk text targets', async () => {
    apiFetchMock.mockResolvedValueOnce({ state: { id: 'state-2' } });

    const outcome = await saveTextEditorDraft({
      target: {
        organismId: 'org-1',
        organismName: 'Field Note',
        openTrunk: true,
        contentTypeId: 'text',
        payload: {
          content: '# Variables',
          format: 'markdown',
        },
      },
      nextContent: '# Updated Variables',
    });

    expect(outcome).toBe('append-state');
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/organisms/org-1/states',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
    expect(body.contentTypeId).toBe('text');
    expect(body.payload.content).toBe('# Updated Variables');
  });

  it('opens a proposal for regulated text targets', async () => {
    apiFetchMock.mockResolvedValueOnce({ proposal: { id: 'proposal-1' } });

    const outcome = await saveTextEditorDraft({
      target: {
        organismId: 'org-2',
        organismName: 'Field Note',
        openTrunk: false,
        contentTypeId: 'text',
        payload: {
          content: '# Variables',
          format: 'markdown',
        },
      },
      nextContent: '# Updated Variables',
    });

    expect(outcome).toBe('open-proposal');
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/organisms/org-2/proposals',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
    expect(body.mutation.kind).toBe('append-state');
    expect(body.mutation.contentTypeId).toBe('text');
    expect(body.mutation.payload.content).toBe('# Updated Variables');
    expect(body.description).toContain('Field Note');
  });
});
