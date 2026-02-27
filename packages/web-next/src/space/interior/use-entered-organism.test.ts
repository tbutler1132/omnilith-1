import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEnteredOrganismCache, loadEnteredOrganismById } from './use-entered-organism.js';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../../api/api-client.js', () => ({
  apiFetch: apiFetchMock,
}));

function createResponse(organismId: string) {
  return {
    organism: {
      id: organismId,
      name: `Organism ${organismId}`,
    },
    currentState: {
      contentTypeId: 'text',
      payload: {
        content: `Hello from ${organismId}`,
        format: 'markdown',
      },
    },
  };
}

describe('use entered organism shared loader', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    clearEnteredOrganismCache();
  });

  it('reuses cached organism data across repeated loads', async () => {
    apiFetchMock.mockResolvedValueOnce(createResponse('org-1'));

    const first = await loadEnteredOrganismById('org-1');
    const second = await loadEnteredOrganismById('org-1');

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('deduplicates concurrent loads for the same organism', async () => {
    let resolveFetch!: (value: ReturnType<typeof createResponse>) => void;
    const fetchPromise = new Promise<ReturnType<typeof createResponse>>((resolve) => {
      resolveFetch = resolve;
    });

    apiFetchMock.mockReturnValueOnce(fetchPromise);

    const firstPromise = loadEnteredOrganismById('org-2');
    const secondPromise = loadEnteredOrganismById('org-2');

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    resolveFetch(createResponse('org-2'));

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first).toEqual(second);
  });

  it('clears failed in-flight state so a retry can load again', async () => {
    apiFetchMock.mockRejectedValueOnce(new Error('load failed')).mockResolvedValueOnce(createResponse('org-3'));

    await expect(loadEnteredOrganismById('org-3')).rejects.toThrow('load failed');
    const retried = await loadEnteredOrganismById('org-3');

    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(retried.organism.id).toBe('org-3');
  });
});
