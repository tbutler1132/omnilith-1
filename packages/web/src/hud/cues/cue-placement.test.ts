import { describe, expect, it } from 'vitest';
import { computeCuePlacement } from './cue-placement.js';

function rect(input: { left: number; top: number; width: number; height: number }): DOMRectReadOnly {
  return {
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  } as DOMRectReadOnly;
}

describe('computeCuePlacement', () => {
  it('places cue above anchor when enough space exists', () => {
    const placement = computeCuePlacement(
      rect({ left: 200, top: 400, width: 120, height: 36 }),
      { width: 200, height: 80 },
      {
        width: 800,
        height: 600,
      },
    );

    expect(placement.placement).toBe('top');
    expect(placement.top).toBeLessThan(400);
  });

  it('falls back below anchor when top space is insufficient', () => {
    const placement = computeCuePlacement(
      rect({ left: 100, top: 18, width: 120, height: 36 }),
      { width: 220, height: 80 },
      {
        width: 800,
        height: 600,
      },
    );

    expect(placement.placement).toBe('bottom');
    expect(placement.top).toBeGreaterThanOrEqual(54);
  });

  it('clamps cue horizontally inside viewport bounds', () => {
    const placement = computeCuePlacement(
      rect({ left: 0, top: 300, width: 80, height: 30 }),
      { width: 320, height: 90 },
      {
        width: 360,
        height: 640,
      },
    );

    expect(placement.left).toBeGreaterThanOrEqual(8);
    expect(placement.left).toBeLessThanOrEqual(32);
  });
});
