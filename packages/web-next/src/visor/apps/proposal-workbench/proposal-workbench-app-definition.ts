/**
 * Proposal Workbench app definition.
 *
 * Registers metadata and route codec for the core proposal review app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { ProposalWorkbenchAppIcon } from '../core/core-app-icons.js';
import { ProposalWorkbenchApp } from './proposal-workbench-app.js';
import {
  clearProposalWorkbenchAppRoute,
  type ProposalWorkbenchAppRouteState,
  parseProposalWorkbenchAppRoute,
  writeProposalWorkbenchAppRoute,
} from './proposal-workbench-app-route.js';

export const proposalWorkbenchAppDefinition: VisorAppDefinition<ProposalWorkbenchAppRouteState> = {
  id: 'proposal-workbench',
  label: 'Proposal Workbench',
  description: 'Inspect and compare offered mutations before regulatory evaluation.',
  registryTier: 'core',
  official: true,
  icon: ProposalWorkbenchAppIcon,
  component: ProposalWorkbenchApp,
  routeCodec: {
    clearRoute: clearProposalWorkbenchAppRoute,
    parseRoute: parseProposalWorkbenchAppRoute,
    writeRoute: writeProposalWorkbenchAppRoute,
  },
};
