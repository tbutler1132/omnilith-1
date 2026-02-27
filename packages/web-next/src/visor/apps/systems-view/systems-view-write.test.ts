import { beforeEach, describe, expect, it, vi } from 'vitest';
import { composeSystemsChild, thresholdTextSystemsOrganism } from './systems-view-write.js';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../../../api/api-client.js', () => ({
  apiFetch: apiFetchMock,
}));

describe('systems view write helpers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('thresholds a text organism', async () => {
    apiFetchMock.mockResolvedValueOnce({
      organism: { id: 'org-7' },
      initialState: { id: 'state-7' },
    });

    await thresholdTextSystemsOrganism({
      name: 'New Child',
      content: '# Hello',
      format: 'markdown',
      openTrunk: true,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/organisms',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      name: 'New Child',
      contentTypeId: 'text',
      payload: {
        content: '# Hello',
        format: 'markdown',
      },
      openTrunk: true,
    });
  });

  it('composes a child into a parent boundary', async () => {
    apiFetchMock.mockResolvedValueOnce({
      composition: {
        parentId: 'parent-1',
        childId: 'child-9',
      },
    });

    await composeSystemsChild({
      parentOrganismId: 'parent-1',
      childId: 'child-9',
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/organisms/parent-1/children',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      childId: 'child-9',
    });
  });
});
