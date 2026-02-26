import { describe, expect, it } from 'vitest';
import {
  altitudeFromZoom,
  applyPan,
  clampToMap,
  createAltitudeZoomProfile,
  createInitialViewport,
  frameOrganismFocus,
  nextAltitude,
  zoomForAltitude,
} from './viewport-math.js';

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

  it('maps altitudes to zoom values', () => {
    expect(zoomForAltitude('high')).toBe(0.25);
    expect(zoomForAltitude('mid')).toBe(0.6);
    expect(zoomForAltitude('close')).toBe(1.3);
  });

  it('derives altitude from zoom', () => {
    expect(altitudeFromZoom(0.23)).toBe('high');
    expect(altitudeFromZoom(0.62)).toBe('mid');
    expect(altitudeFromZoom(1.28)).toBe('close');
  });

  it('moves through altitude levels in both directions', () => {
    expect(nextAltitude('high', 'in')).toBe('mid');
    expect(nextAltitude('mid', 'in')).toBe('close');
    expect(nextAltitude('close', 'in')).toBeNull();

    expect(nextAltitude('close', 'out')).toBe('mid');
    expect(nextAltitude('mid', 'out')).toBe('high');
    expect(nextAltitude('high', 'out')).toBeNull();
  });

  it('supports map-specific altitude zoom profiles', () => {
    const profile = createAltitudeZoomProfile(2.1);

    expect(zoomForAltitude('high', profile)).toBeCloseTo(0.525);
    expect(zoomForAltitude('mid', profile)).toBeCloseTo(1.26);
    expect(zoomForAltitude('close', profile)).toBeCloseTo(2.73);
    expect(altitudeFromZoom(1.21, profile)).toBe('mid');
    expect(createInitialViewport(2000, 2000, profile).zoom).toBeCloseTo(0.525);
  });

  it('frames focused organisms at close zoom', () => {
    const profile = createAltitudeZoomProfile(3.88);

    expect(frameOrganismFocus(100, 200, profile)).toEqual({
      x: 100,
      y: 200,
      zoom: zoomForAltitude('close', profile),
    });
  });
});
