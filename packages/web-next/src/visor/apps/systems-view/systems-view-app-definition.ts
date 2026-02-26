/**
 * Systems View app definition.
 *
 * Registers metadata and route codec for the core structural composition app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { SystemsViewAppIcon } from '../core/core-app-icons.js';
import { SystemsViewApp } from './systems-view-app.js';
import {
  clearSystemsViewAppRoute,
  parseSystemsViewAppRoute,
  type SystemsViewAppRouteState,
  writeSystemsViewAppRoute,
} from './systems-view-app-route.js';

export const systemsViewAppDefinition: VisorAppDefinition<SystemsViewAppRouteState> = {
  id: 'systems-view',
  label: 'Systems View',
  description: 'Structural composition workspace for boundaries and policy wiring.',
  registryTier: 'core',
  official: true,
  icon: SystemsViewAppIcon,
  component: SystemsViewApp,
  routeCodec: {
    clearRoute: clearSystemsViewAppRoute,
    parseRoute: parseSystemsViewAppRoute,
    writeRoute: writeSystemsViewAppRoute,
  },
};
