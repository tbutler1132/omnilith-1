import { describe, expect, it } from 'vitest';
import { resolveMarkerSizeMultiplier, shouldRenderDetailCard } from './space-organism-layer.js';

describe('resolveMarkerSizeMultiplier', () => {
  it('preserves true derived size without visual floor inflation', () => {
    expect(resolveMarkerSizeMultiplier(0.07246817274288073)).toBeCloseTo(0.07246817274288073, 12);
  });

  it('uses neutral default when entry size is missing or invalid', () => {
    expect(resolveMarkerSizeMultiplier(undefined)).toBe(1);
    expect(resolveMarkerSizeMultiplier(Number.NaN)).toBe(1);
    expect(resolveMarkerSizeMultiplier(-2)).toBe(1);
  });

  it('hides detail cards for very small markers', () => {
    expect(shouldRenderDetailCard(resolveMarkerSizeMultiplier(0.07246817274288073))).toBe(false);
    expect(shouldRenderDetailCard(resolveMarkerSizeMultiplier(0.8))).toBe(true);
  });
});
