/**
 * Organism app definition.
 *
 * Registers metadata and render module for the first real Organism app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { OrganismApp } from './organism-app.js';
import { OrganismAppIcon } from './organism-app-icon.js';
import {
  clearOrganismAppRoute,
  type OrganismAppRouteState,
  parseOrganismAppRoute,
  writeOrganismAppRoute,
} from './organism-app-route.js';

export const organismAppDefinition: VisorAppDefinition<OrganismAppRouteState> = {
  id: 'organism',
  label: 'Organism',
  description: 'Overview and user-scoped organism navigation.',
  registryTier: 'extra',
  official: true,
  icon: OrganismAppIcon,
  component: OrganismApp,
  routeCodec: {
    clearRoute: clearOrganismAppRoute,
    parseRoute: parseOrganismAppRoute,
    writeRoute: writeOrganismAppRoute,
  },
};
