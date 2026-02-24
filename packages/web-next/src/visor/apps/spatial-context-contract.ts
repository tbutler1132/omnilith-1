/**
 * Visor app spatial context contract.
 *
 * Defines the stable app-facing snapshot for "where the user is in Space"
 * so every app can react to map context using the same expectations.
 */

import type { Altitude } from '../../contracts/altitude.js';

export const SPATIAL_CONTEXT_COORDINATE_SYSTEM_VERSION = 'omnilith-space-stage-v1';

export interface VisorAppSpatialViewport {
  readonly x: number;
  readonly y: number;
  readonly z: number | null;
  readonly zoom: number;
  readonly altitude: Altitude;
}

export interface VisorAppSpatialContext {
  readonly mapOrganismId: string | null;
  readonly focusedOrganismId: string | null;
  readonly viewport: VisorAppSpatialViewport | null;
  readonly surfaceSelection: ReadonlyArray<string>;
  readonly boundaryPath: ReadonlyArray<string>;
  readonly timestamp: string;
  readonly coordinateSystemVersion: string;
}

export type SpatialContextChangedListener = (context: VisorAppSpatialContext) => void;

export function createEmptySpatialContext(): VisorAppSpatialContext {
  return {
    mapOrganismId: null,
    focusedOrganismId: null,
    viewport: null,
    surfaceSelection: [],
    boundaryPath: [],
    timestamp: new Date(0).toISOString(),
    coordinateSystemVersion: SPATIAL_CONTEXT_COORDINATE_SYSTEM_VERSION,
  };
}
