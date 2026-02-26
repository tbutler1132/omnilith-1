/**
 * Map Studio app definition.
 *
 * Registers metadata and route codec for the core map surfacing workspace.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { MapStudioAppIcon } from '../core/core-app-icons.js';
import { MapStudioApp } from './map-studio-app.js';
import {
  clearMapStudioAppRoute,
  type MapStudioAppRouteState,
  parseMapStudioAppRoute,
  writeMapStudioAppRoute,
} from './map-studio-app-route.js';

export const mapStudioAppDefinition: VisorAppDefinition<MapStudioAppRouteState> = {
  id: 'map-studio',
  label: 'Map Studio',
  description: 'Curate map surfacing and placement for intentional navigation.',
  registryTier: 'core',
  official: true,
  icon: MapStudioAppIcon,
  component: MapStudioApp,
  routeCodec: {
    clearRoute: clearMapStudioAppRoute,
    parseRoute: parseMapStudioAppRoute,
    writeRoute: writeMapStudioAppRoute,
  },
};
