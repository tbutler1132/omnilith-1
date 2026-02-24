/**
 * Spatial map payload parsing tests.
 *
 * Verifies that web-next reads map dimensions and organism entries safely
 * from spatial-map payloads.
 */

import { describe, expect, it } from 'vitest';
import { parseSpatialMapPayload } from './use-spatial-map.js';

describe('parseSpatialMapPayload', () => {
  it('returns defaults for invalid payload input', () => {
    const parsed = parseSpatialMapPayload(null);

    expect(parsed).toEqual({
      width: 5000,
      height: 5000,
      entries: [],
    });
  });

  it('parses valid entries and filters malformed entry records', () => {
    const parsed = parseSpatialMapPayload({
      width: 2400,
      height: 1700,
      entries: [
        { organismId: 'org_a', x: 100, y: 200, size: 1.1, emphasis: 0.8 },
        { organismId: 'org_b', x: 350, y: 420 },
        { organismId: 'org_bad_1', x: '100', y: 200 },
        { organismId: 'org_bad_2', x: 100 },
        { organismId: 'org_bad_3', x: 100, y: 100, size: 'large' },
      ],
    });

    expect(parsed.width).toBe(2400);
    expect(parsed.height).toBe(1700);
    expect(parsed.entries).toEqual([
      { organismId: 'org_a', x: 100, y: 200, size: 1.1, emphasis: 0.8 },
      { organismId: 'org_b', x: 350, y: 420 },
    ]);
  });
});
