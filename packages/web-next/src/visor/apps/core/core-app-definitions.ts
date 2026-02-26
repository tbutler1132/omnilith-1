/**
 * Core visor app definitions.
 *
 * Declares the default first-party app set that captures the essential
 * tending surfaces required for the Phase 1 visor experience.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { integrationQueueAppDefinition } from '../integration-queue/index.js';
import { mapStudioAppDefinition as mapStudioAppDefinitionCore } from '../map-studio/index.js';
import { organismViewAppDefinition } from '../organism-view/index.js';
import { proposalWorkbenchAppDefinition } from '../proposal-workbench/index.js';
import { queryExplorerAppDefinition as queryExplorerAppDefinitionCore } from '../query-explorer/index.js';
import { systemsViewAppDefinition as systemsViewAppDefinitionCore } from '../systems-view/index.js';
import { createCoreAppComponent } from './core-app.js';
import { VitalityEventStreamAppIcon } from './core-app-icons.js';

export const systemsViewAppDefinition: VisorAppDefinition = systemsViewAppDefinitionCore as VisorAppDefinition;

export const mapStudioAppDefinition: VisorAppDefinition = mapStudioAppDefinitionCore as VisorAppDefinition;

export const queryExplorerAppDefinition: VisorAppDefinition = queryExplorerAppDefinitionCore as VisorAppDefinition;

export const vitalityEventStreamAppDefinition: VisorAppDefinition = {
  id: 'vitality-event-stream',
  label: 'Vitality + Events',
  description: 'Cross-cutting vitality awareness and infrastructure event trace.',
  icon: VitalityEventStreamAppIcon,
  component: createCoreAppComponent({
    appName: 'Vitality + Event Stream',
    purpose: 'Monitor vitality shifts and infrastructure events to guide tending priorities.',
    primaryFlow: 'Primary flow: identify dormant risk, momentum shifts, and recently mutated organisms.',
    secondaryFlow: 'Secondary flow: pivot from event trace to proposal and composition surfaces.',
  }),
  registryTier: 'core',
  official: true,
};

export const coreVisorAppDefinitions: ReadonlyArray<VisorAppDefinition> = [
  organismViewAppDefinition as VisorAppDefinition,
  proposalWorkbenchAppDefinition as VisorAppDefinition,
  integrationQueueAppDefinition as VisorAppDefinition,
  systemsViewAppDefinition,
  mapStudioAppDefinition,
  vitalityEventStreamAppDefinition,
  queryExplorerAppDefinition,
];
