import { describe, expect, it } from 'vitest';
import { resolveDetailIds } from './SpaceLayer.js';
import type { SpatialMapEntry } from './use-spatial-map.js';

describe('resolveDetailIds', () => {
  it('returns all visible entry IDs so high-altitude markers can use content type distinctions', () => {
    const visibleEntries: SpatialMapEntry[] = [
      { organismId: 'org_community', x: 100, y: 120 },
      { organismId: 'org_song', x: 400, y: 500 },
    ];

    expect(resolveDetailIds(visibleEntries)).toEqual(['org_community', 'org_song']);
  });
});
