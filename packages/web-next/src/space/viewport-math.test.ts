import { describe, expect, it } from 'vitest';
import { applyPan, clampToMap, createInitialViewport } from './viewport-math.js';

describe('viewport math', () => {
  it('centers initial viewport on map', () => {
    expect(createInitialViewport(5000, 3000)).toEqual({
      x: 2500,
      y: 1500,
      zoom: 0.25,
    });
  });

  it('applies drag delta in world space', () => {
    const result = applyPan({ x: 1000, y: 1200, zoom: 0.25 }, 50, -25);

    expect(result).toEqual({ x: 800, y: 1300, zoom: 0.25 });
  });

  it('clamps viewport to map bounds', () => {
    const result = clampToMap({ x: -9999, y: 99999, zoom: 0.25 }, { width: 1000, height: 800 }, 5000, 5000);

    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(5000);
  });
});
