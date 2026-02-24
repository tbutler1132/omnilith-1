/**
 * Space stage interaction policy.
 *
 * Centralizes altitude and marker-activation decisions so Space behavior
 * can be tested without rendering concerns.
 */

import type { Altitude } from '../contracts/altitude.js';

const ALTITUDE_RANK: Readonly<Record<Altitude, number>> = {
  high: 0,
  mid: 1,
  close: 2,
};

interface ShouldClearFocusedOrganismInput {
  readonly previousAltitude: Altitude | null;
  readonly nextAltitude: Altitude;
}

export function shouldClearFocusedOrganism(input: ShouldClearFocusedOrganismInput): boolean {
  if (input.previousAltitude === null) {
    return false;
  }

  return ALTITUDE_RANK[input.nextAltitude] < ALTITUDE_RANK[input.previousAltitude];
}

interface ResolveMarkerActivationIntentInput {
  readonly altitude: Altitude;
  readonly isSameMarker: boolean;
  readonly canEnterMap: boolean;
  readonly canEnterInterior: boolean;
}

export type MarkerActivationIntent = 'focus' | 'enter-map' | 'enter-interior';

export function resolveMarkerActivationIntent(input: ResolveMarkerActivationIntentInput): MarkerActivationIntent {
  if (input.altitude === 'close') {
    if (input.canEnterMap) {
      return 'enter-map';
    }

    if (input.canEnterInterior) {
      return 'enter-interior';
    }
  }

  if (input.isSameMarker && input.canEnterMap) {
    return 'enter-map';
  }

  if (input.isSameMarker && input.canEnterInterior) {
    return 'enter-interior';
  }

  return 'focus';
}
