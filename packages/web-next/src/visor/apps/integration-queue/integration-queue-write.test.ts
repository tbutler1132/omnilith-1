import { beforeEach, describe, expect, it, vi } from 'vitest';
import { declineQueueProposal, integrateQueueProposal } from './integration-queue-write.js';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../../../api/api-client.js', () => ({
  apiFetch: apiFetchMock,
}));

describe('integration queue write helpers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('integrates a proposal', async () => {
    apiFetchMock.mockResolvedValueOnce({
      proposal: { id: 'proposal-1', status: 'integrated' },
    });

    await integrateQueueProposal('proposal-1');

    expect(apiFetchMock).toHaveBeenCalledWith('/proposals/proposal-1/integrate', {
      method: 'POST',
    });
  });

  it('declines a proposal', async () => {
    apiFetchMock.mockResolvedValueOnce({
      proposal: { id: 'proposal-1', status: 'declined' },
    });

    await declineQueueProposal('proposal-1');

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/proposals/proposal-1/decline',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({});
  });
});
