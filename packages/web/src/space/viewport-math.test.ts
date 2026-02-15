/**
 * Viewport math tests — altitude system and coordinate transforms.
 */

import { describe, expect, it } from 'vitest';
import {
  altitudeFromZoom,
  ENTER_ZOOM,
  frameOrganism,
  frameOrganismEnter,
  nextAltitude,
  zoomForAltitude,
} from './viewport-math.js';

describe('nextAltitude', () => {
  it('navigating in from high goes to mid', () => {
    expect(nextAltitude('high', 'in')).toBe('mid');
  });

  it('navigating in from mid goes to close', () => {
    expect(nextAltitude('mid', 'in')).toBe('close');
  });

  it('navigating in from close returns null (already at boundary)', () => {
    expect(nextAltitude('close', 'in')).toBeNull();
  });

  it('navigating out from close goes to mid', () => {
    expect(nextAltitude('close', 'out')).toBe('mid');
  });

  it('navigating out from mid goes to high', () => {
    expect(nextAltitude('mid', 'out')).toBe('high');
  });

  it('navigating out from high returns null (already at boundary)', () => {
    expect(nextAltitude('high', 'out')).toBeNull();
  });
});

describe('altitudeFromZoom', () => {
  it('snaps 0.25 to high', () => {
    expect(altitudeFromZoom(0.25)).toBe('high');
  });

  it('snaps 0.6 to mid', () => {
    expect(altitudeFromZoom(0.6)).toBe('mid');
  });

  it('snaps 1.3 to close', () => {
    expect(altitudeFromZoom(1.3)).toBe('close');
  });

  it('snaps a value near high to high', () => {
    expect(altitudeFromZoom(0.1)).toBe('high');
  });

  it('snaps a value between high and mid to the nearest', () => {
    // Midpoint between 0.25 and 0.6 is 0.425
    expect(altitudeFromZoom(0.4)).toBe('high');
    expect(altitudeFromZoom(0.45)).toBe('mid');
  });

  it('snaps a value between mid and close to the nearest', () => {
    // Midpoint between 0.6 and 1.3 is 0.95
    expect(altitudeFromZoom(0.9)).toBe('mid');
    expect(altitudeFromZoom(1.0)).toBe('close');
  });

  it('snaps a very large value to close', () => {
    expect(altitudeFromZoom(5.0)).toBe('close');
  });
});

describe('zoomForAltitude', () => {
  it('returns 0.25 for high', () => {
    expect(zoomForAltitude('high')).toBe(0.25);
  });

  it('returns 0.6 for mid', () => {
    expect(zoomForAltitude('mid')).toBe(0.6);
  });

  it('returns 1.3 for close', () => {
    expect(zoomForAltitude('close')).toBe(1.3);
  });
});

describe('frameOrganism', () => {
  it('centers on the organism at Close altitude zoom', () => {
    const vp = frameOrganism(500, 700);
    expect(vp.x).toBe(500);
    expect(vp.y).toBe(700);
    expect(vp.zoom).toBe(zoomForAltitude('close'));
  });
});

describe('frameOrganismEnter', () => {
  it('centers on the organism at ENTER_ZOOM (4.0)', () => {
    const vp = frameOrganismEnter(300, 400);
    expect(vp.x).toBe(300);
    expect(vp.y).toBe(400);
    expect(vp.zoom).toBe(ENTER_ZOOM);
  });
});
