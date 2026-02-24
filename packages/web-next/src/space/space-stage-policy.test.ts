import { describe, expect, it } from 'vitest';
import { resolveMarkerActivationIntent, shouldClearFocusedOrganism } from './space-stage-policy.js';

describe('space stage policy', () => {
  describe('shouldClearFocusedOrganism', () => {
    it('clears focus when altitude moves outward', () => {
      expect(shouldClearFocusedOrganism({ previousAltitude: 'close', nextAltitude: 'mid' })).toBe(true);
      expect(shouldClearFocusedOrganism({ previousAltitude: 'mid', nextAltitude: 'high' })).toBe(true);
    });

    it('keeps focus when altitude stays the same or moves inward', () => {
      expect(shouldClearFocusedOrganism({ previousAltitude: null, nextAltitude: 'high' })).toBe(false);
      expect(shouldClearFocusedOrganism({ previousAltitude: 'high', nextAltitude: 'high' })).toBe(false);
      expect(shouldClearFocusedOrganism({ previousAltitude: 'high', nextAltitude: 'mid' })).toBe(false);
      expect(shouldClearFocusedOrganism({ previousAltitude: 'mid', nextAltitude: 'close' })).toBe(false);
    });
  });

  describe('resolveMarkerActivationIntent', () => {
    it('enters immediately at close altitude when map entry is enterable', () => {
      expect(
        resolveMarkerActivationIntent({
          altitude: 'close',
          isSameMarker: false,
          canEnterMap: true,
          canEnterInterior: false,
        }),
      ).toBe('enter-map');
    });

    it('enters interior at close altitude when marker has non-map content', () => {
      expect(
        resolveMarkerActivationIntent({
          altitude: 'close',
          isSameMarker: false,
          canEnterMap: false,
          canEnterInterior: true,
        }),
      ).toBe('enter-interior');
    });

    it('prioritizes map entry when both map and interior are enterable at close altitude', () => {
      expect(
        resolveMarkerActivationIntent({
          altitude: 'close',
          isSameMarker: true,
          canEnterMap: true,
          canEnterInterior: true,
        }),
      ).toBe('enter-map');
    });

    it('uses second-click enter behavior at high and mid altitudes', () => {
      expect(
        resolveMarkerActivationIntent({
          altitude: 'high',
          isSameMarker: true,
          canEnterMap: false,
          canEnterInterior: true,
        }),
      ).toBe('enter-interior');

      expect(
        resolveMarkerActivationIntent({
          altitude: 'mid',
          isSameMarker: true,
          canEnterMap: true,
          canEnterInterior: false,
        }),
      ).toBe('enter-map');
    });

    it('focuses marker when enter conditions are not met', () => {
      expect(
        resolveMarkerActivationIntent({
          altitude: 'high',
          isSameMarker: false,
          canEnterMap: true,
          canEnterInterior: false,
        }),
      ).toBe('focus');

      expect(
        resolveMarkerActivationIntent({
          altitude: 'close',
          isSameMarker: true,
          canEnterMap: false,
          canEnterInterior: false,
        }),
      ).toBe('focus');
    });
  });
});
