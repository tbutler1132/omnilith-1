/**
 * Query Explorer app definition.
 *
 * Registers metadata and route codec for the core global retrieval app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { QueryExplorerAppIcon } from '../core/core-app-icons.js';
import { QueryExplorerApp } from './query-explorer-app.js';
import {
  clearQueryExplorerAppRoute,
  parseQueryExplorerAppRoute,
  type QueryExplorerAppRouteState,
  writeQueryExplorerAppRoute,
} from './query-explorer-app-route.js';

export const queryExplorerAppDefinition: VisorAppDefinition<QueryExplorerAppRouteState> = {
  id: 'query-explorer',
  label: 'Query Explorer',
  description: 'Global retrieval across organisms with filterable query context.',
  registryTier: 'core',
  official: true,
  icon: QueryExplorerAppIcon,
  component: QueryExplorerApp,
  routeCodec: {
    clearRoute: clearQueryExplorerAppRoute,
    parseRoute: parseQueryExplorerAppRoute,
    writeRoute: writeQueryExplorerAppRoute,
  },
};
