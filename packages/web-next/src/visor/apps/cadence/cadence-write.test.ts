import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCadenceUpdatedPayload,
  canEditCadenceChild,
  getCadenceTextPayload,
  saveCadenceChildDraft,
} from './cadence-write.js';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../../../api/api-client.js', () => ({
  apiFetch: apiFetchMock,
}));

describe('cadence write helpers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('detects editable text payloads', () => {
    expect(
      canEditCadenceChild({
        contentTypeId: 'text',
        payload: {
          content: 'hello',
          format: 'markdown',
        },
      }),
    ).toBe(true);

    expect(
      canEditCadenceChild({
        contentTypeId: 'sensor',
        payload: {
          content: 'hello',
        },
      }),
    ).toBe(false);

    expect(
      canEditCadenceChild({
        contentTypeId: 'text',
        payload: {
          body: 'hello',
        },
      }),
    ).toBe(false);
  });

  it('preserves payload fields while replacing text content', () => {
    const updated = buildCadenceUpdatedPayload(
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
    expect(getCadenceTextPayload(undefined)).toBeNull();
    expect(getCadenceTextPayload({})).toBeNull();
  });

  it('appends state for open-trunk cadence children', async () => {
    apiFetchMock.mockResolvedValueOnce({ state: { id: 'state-2' } });

    const outcome = await saveCadenceChildDraft(
      {
        childId: 'org-1',
        name: 'capital-community-variables',
        openTrunk: true,
        contentTypeId: 'text',
        payload: {
          content: '# Variables',
          format: 'markdown',
        },
      },
      '# Updated Variables',
    );

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

  it('opens a proposal for regulated cadence children', async () => {
    apiFetchMock.mockResolvedValueOnce({ proposal: { id: 'proposal-1' } });

    const outcome = await saveCadenceChildDraft(
      {
        childId: 'org-2',
        name: 'capital-community-variables',
        openTrunk: false,
        contentTypeId: 'text',
        payload: {
          content: '# Variables',
          format: 'markdown',
        },
      },
      '# Updated Variables',
    );

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
    expect(body.description).toContain('capital-community-variables');
  });
});
