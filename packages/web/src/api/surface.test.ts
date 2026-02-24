import { beforeEach, describe, expect, it, vi } from 'vitest';
import { surfaceOrganismOnMap } from './organisms.js';
import { surfaceOnWorldMap } from './surface.js';

vi.mock('./organisms.js', () => ({
  surfaceOrganismOnMap: vi.fn(),
}));

describe('surfaceOnWorldMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates surfacing to the canonical API endpoint', async () => {
    const mockedSurfaceOrganismOnMap = vi.mocked(surfaceOrganismOnMap);
    mockedSurfaceOrganismOnMap.mockResolvedValue({
      status: 'surfaced',
      entry: { organismId: 'org_song', x: 100, y: 120, size: 1.1 },
      state: {} as never,
      derived: {
        size: 1.1,
        strategy: 'compositional-mass',
        inputs: {},
      },
    });

    await surfaceOnWorldMap('org_map', 'org_song', 100, 120);

    expect(mockedSurfaceOrganismOnMap).toHaveBeenCalledTimes(1);
    expect(mockedSurfaceOrganismOnMap).toHaveBeenCalledWith('org_map', {
      organismId: 'org_song',
      x: 100,
      y: 120,
    });
  });
});
