/**
 * Integration Queue app definition.
 *
 * Registers metadata and route codec for the core proposal decision queue app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { IntegrationQueueAppIcon } from '../core/core-app-icons.js';
import { IntegrationQueueApp } from './integration-queue-app.js';
import {
  clearIntegrationQueueAppRoute,
  type IntegrationQueueAppRouteState,
  parseIntegrationQueueAppRoute,
  writeIntegrationQueueAppRoute,
} from './integration-queue-app-route.js';

export const integrationQueueAppDefinition: VisorAppDefinition<IntegrationQueueAppRouteState> = {
  id: 'integration-queue',
  label: 'Integration Queue',
  description: 'Daily tending queue for integrate and decline decisions.',
  registryTier: 'core',
  official: true,
  icon: IntegrationQueueAppIcon,
  component: IntegrationQueueApp,
  routeCodec: {
    clearRoute: clearIntegrationQueueAppRoute,
    parseRoute: parseIntegrationQueueAppRoute,
    writeRoute: writeIntegrationQueueAppRoute,
  },
};
