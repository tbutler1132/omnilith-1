import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client.js';
import { appendState, fetchOrganism } from './organisms.js';
import { surfaceOnWorldMap } from './surface.js';

vi.mock('./organisms.js', () => ({
  appendState: vi.fn(),
  fetchOrganism: vi.fn(),
}));

function mapSnapshot(
  entries: Array<{ organismId: string; x: number; y: number }>,
): Awaited<ReturnType<typeof fetchOrganism>> {
  return {
    organism: {
      id: 'org_map',
      name: 'World Map',
      createdAt: 0,
      createdBy: 'usr_seed',
      openTrunk: true,
    },
    currentState: {
      id: 'state_map',
      organismId: 'org_map',
      contentTypeId: 'spatial-map',
      payload: { entries },
      createdAt: 0,
      createdBy: 'usr_seed',
      sequenceNumber: 1,
      parentStateId: undefined,
    },
  } as Awaited<ReturnType<typeof fetchOrganism>>;
}

describe('surfaceOnWorldMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns without appending when the organism is already surfaced', async () => {
    const mockedFetchOrganism = vi.mocked(fetchOrganism);
    const mockedAppendState = vi.mocked(appendState);

    mockedFetchOrganism.mockResolvedValue(mapSnapshot([{ organismId: 'org_song', x: 25, y: 40 }]));

    await surfaceOnWorldMap('org_map', 'org_song', 100, 120);

    expect(mockedAppendState).not.toHaveBeenCalled();
  });

  it('appends a new spatial-map entry when not already surfaced', async () => {
    const mockedFetchOrganism = vi.mocked(fetchOrganism);
    const mockedAppendState = vi.mocked(appendState);

    mockedFetchOrganism.mockResolvedValue(mapSnapshot([]));
    mockedAppendState.mockResolvedValue({ state: {} } as Awaited<ReturnType<typeof appendState>>);

    await surfaceOnWorldMap('org_map', 'org_song', 100, 120);

    expect(mockedAppendState).toHaveBeenCalledTimes(1);
    expect(mockedAppendState).toHaveBeenCalledWith('org_map', 'spatial-map', {
      entries: [{ organismId: 'org_song', x: 100, y: 120 }],
    });
  });

  it('retries transient append failures and merges with latest map entries', async () => {
    const mockedFetchOrganism = vi.mocked(fetchOrganism);
    const mockedAppendState = vi.mocked(appendState);

    mockedFetchOrganism
      .mockResolvedValueOnce(mapSnapshot([]))
      .mockResolvedValueOnce(mapSnapshot([]))
      .mockResolvedValueOnce(mapSnapshot([{ organismId: 'org_other', x: 2, y: 4 }]));

    mockedAppendState
      .mockRejectedValueOnce(new Error('Internal server error'))
      .mockResolvedValueOnce({ state: {} } as Awaited<ReturnType<typeof appendState>>);

    await surfaceOnWorldMap('org_map', 'org_song', 100, 120);

    expect(mockedAppendState).toHaveBeenCalledTimes(2);
    expect(mockedAppendState.mock.calls[1]?.[2]).toEqual({
      entries: [
        { organismId: 'org_other', x: 2, y: 4 },
        { organismId: 'org_song', x: 100, y: 120 },
      ],
    });
  });

  it('returns when a concurrent writer surfaces the organism during retry', async () => {
    const mockedFetchOrganism = vi.mocked(fetchOrganism);
    const mockedAppendState = vi.mocked(appendState);

    mockedFetchOrganism
      .mockResolvedValueOnce(mapSnapshot([]))
      .mockResolvedValueOnce(mapSnapshot([{ organismId: 'org_song', x: 100, y: 120 }]));
    mockedAppendState.mockRejectedValueOnce(new Error('Internal server error'));

    await expect(surfaceOnWorldMap('org_map', 'org_song', 100, 120)).resolves.toBeUndefined();
    expect(mockedAppendState).toHaveBeenCalledTimes(1);
  });

  it('does not retry client errors', async () => {
    const mockedFetchOrganism = vi.mocked(fetchOrganism);
    const mockedAppendState = vi.mocked(appendState);

    mockedFetchOrganism.mockResolvedValue(mapSnapshot([]));
    mockedAppendState.mockRejectedValue(new ApiError(403, 'Forbidden'));

    await expect(surfaceOnWorldMap('org_map', 'org_song', 100, 120)).rejects.toBeInstanceOf(ApiError);
    expect(mockedFetchOrganism).toHaveBeenCalledTimes(1);
    expect(mockedAppendState).toHaveBeenCalledTimes(1);
  });
});
