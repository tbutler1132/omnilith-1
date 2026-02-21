/**
 * Space ambient layer contract — canonical world overlays rendered inside Space.
 *
 * Ambient layers represent conditions that are happening in Space itself
 * (for example weather or field intensity), not visor interpretation modes.
 */

import type { ReactNode } from 'react';
import type { Altitude } from '../../contracts/altitude.js';
import type { SpatialMapEntry } from '../use-spatial-map.js';
import type { ScreenSize, ViewportState } from '../viewport-math.js';

export interface SpaceAmbientLayerContext {
  mapId: string;
  entries: SpatialMapEntry[];
  viewport: ViewportState;
  screenSize: ScreenSize;
  altitude: Altitude;
  focusedOrganismId: string | null;
  enteredOrganismId: string | null;
}

export interface SpaceAmbientLayerDefinition {
  id: string;
  order: number;
  render: (context: SpaceAmbientLayerContext) => ReactNode;
}
