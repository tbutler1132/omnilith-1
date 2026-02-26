/**
 * Organism View app definition.
 *
 * Registers metadata and route codec for the core universal layer read app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { OrganismViewAppIcon } from '../core/core-app-icons.js';
import { OrganismViewApp } from './organism-view-app.js';
import {
  clearOrganismViewAppRoute,
  type OrganismViewAppRouteState,
  parseOrganismViewAppRoute,
  writeOrganismViewAppRoute,
} from './organism-view-app-route.js';

export const organismViewAppDefinition: VisorAppDefinition<OrganismViewAppRouteState> = {
  id: 'organism-view',
  label: 'Organism View',
  description: 'Universal layer for current state, state history, and composition context.',
  registryTier: 'core',
  official: true,
  icon: OrganismViewAppIcon,
  component: OrganismViewApp,
  routeCodec: {
    clearRoute: clearOrganismViewAppRoute,
    parseRoute: parseOrganismViewAppRoute,
    writeRoute: writeOrganismViewAppRoute,
  },
};
