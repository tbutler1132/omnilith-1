import { beforeEach, describe, expect, it, vi } from 'vitest';
import { surfaceMapStudioCandidate } from './map-studio-write.js';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../../../api/api-client.js', () => ({
  apiFetch: apiFetchMock,
}));

describe('map studio write helpers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('posts map upsert for organism placement', async () => {
    apiFetchMock.mockResolvedValueOnce({
      status: 'surfaced',
      entry: {
        organismId: 'org-7',
        x: 100,
        y: 200,
      },
    });

    await surfaceMapStudioCandidate({
      mapOrganismId: 'map-1',
      organismId: 'org-7',
      x: 100,
      y: 200,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/organisms/map-1/surface',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      organismId: 'org-7',
      x: 100,
      y: 200,
    });
  });
});
