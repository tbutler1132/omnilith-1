import { describe, expect, it } from 'vitest';
import { resolveMarkerSizePolicy } from './marker-size-policy.js';
import { resolveRenderedCoreSizeMultiplier } from './space-organism-layer.js';
import { zoomForAltitude } from './viewport-math.js';

describe('resolveMarkerSizePolicy', () => {
  it('boosts tiny markers on world map at high altitude while preserving tiny core truth at close altitude', () => {
    const high = resolveMarkerSizePolicy({
      entrySize: 0.07246817274288073,
      zoom: zoomForAltitude('high'),
      altitude: 'high',
    });
    const close = resolveMarkerSizePolicy({
      entrySize: 0.07246817274288073,
      zoom: zoomForAltitude('close'),
      altitude: 'close',
    });

    expect(high.coreSizeMultiplier).toBeGreaterThan(close.coreSizeMultiplier);
    expect(close.coreSizeMultiplier).toBeCloseTo(0.07246817274288073, 12);
    expect(high.haloVisible).toBe(true);
    expect(close.haloVisible).toBe(true);
    expect(close.interactionSizeMultiplier).toBeGreaterThan(close.coreSizeMultiplier);
  });

  it('converges smoothly from boosted to proportional between mid and close altitudes', () => {
    const mid = resolveMarkerSizePolicy({
      entrySize: 0.07246817274288073,
      zoom: zoomForAltitude('mid'),
      altitude: 'mid',
    });
    const between = resolveMarkerSizePolicy({
      entrySize: 0.07246817274288073,
      zoom: 0.8,
      altitude: 'mid',
    });
    const close = resolveMarkerSizePolicy({
      entrySize: 0.07246817274288073,
      zoom: zoomForAltitude('close'),
      altitude: 'close',
    });

    expect(mid.coreSizeMultiplier).toBeGreaterThan(between.coreSizeMultiplier);
    expect(between.coreSizeMultiplier).toBeGreaterThan(close.coreSizeMultiplier);
    expect(close.blend).toBe(1);
  });

  it('keeps invalid and missing values safe while preserving detail-card behavior', () => {
    const mid = resolveMarkerSizePolicy({
      entrySize: undefined,
      zoom: zoomForAltitude('mid'),
      altitude: 'mid',
    });

    expect(mid.coreSizeMultiplier).toBeGreaterThan(0);
    expect(mid.interactionSizeMultiplier).toBeGreaterThanOrEqual(mid.coreSizeMultiplier);
    expect(mid.showDetailCard).toBe(true);
  });

  it('compresses extreme size outliers when normalization context is provided', () => {
    const withoutNormalization = resolveMarkerSizePolicy({
      entrySize: 2.4,
      zoom: zoomForAltitude('high'),
      altitude: 'high',
    });
    const withNormalization = resolveMarkerSizePolicy({
      entrySize: 2.4,
      zoom: zoomForAltitude('high'),
      altitude: 'high',
      normalizationContext: {
        qLow: 0.12,
        qHigh: 1.2,
        median: 0.48,
        count: 24,
      },
    });

    expect(withNormalization.coreSizeMultiplier).toBeLessThan(withoutNormalization.coreSizeMultiplier);
  });
});

describe('resolveRenderedCoreSizeMultiplier', () => {
  it('preserves exact proportional size when marker is not focused', () => {
    expect(resolveRenderedCoreSizeMultiplier(0.07246817274288073, false)).toBeCloseTo(0.07246817274288073, 12);
  });

  it('applies a visibility floor for focused tiny markers', () => {
    expect(resolveRenderedCoreSizeMultiplier(0.01, true)).toBe(0.24);
  });

  it('keeps larger focused markers unchanged', () => {
    expect(resolveRenderedCoreSizeMultiplier(0.88, true)).toBe(0.88);
  });
});
