/**
 * Core visor app definitions.
 *
 * Declares the default first-party app set that captures the essential
 * tending surfaces required for the Phase 1 visor experience.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { organismViewAppDefinition } from '../organism-view/index.js';
import { proposalWorkbenchAppDefinition } from '../proposal-workbench/index.js';
import { createCoreAppComponent } from './core-app.js';
import {
  IntegrationQueueAppIcon,
  MapStudioAppIcon,
  QueryExplorerAppIcon,
  SystemsViewAppIcon,
  VitalityEventStreamAppIcon,
} from './core-app-icons.js';

export const integrationQueueAppDefinition: VisorAppDefinition = {
  id: 'integration-queue',
  label: 'Integration Queue',
  description: 'Daily tending queue for integrate and decline decisions.',
  icon: IntegrationQueueAppIcon,
  component: createCoreAppComponent({
    appName: 'Integration Queue',
    purpose: 'Work pending proposal decisions in one focused queue.',
    primaryFlow: 'Primary flow: prioritize pending proposals and decide integrate or decline.',
    secondaryFlow: 'Secondary flow: surface policy context and route to proposal details.',
  }),
  registryTier: 'core',
  official: true,
};

export const systemsViewAppDefinition: VisorAppDefinition = {
  id: 'systems-view',
  label: 'Systems View',
  description: 'Structural composition workspace for boundaries and policy wiring.',
  icon: SystemsViewAppIcon,
  component: createCoreAppComponent({
    appName: 'Systems View',
    purpose: 'Design and tend organism composition as explicit boundary structure.',
    primaryFlow: 'Primary flow: place and remove organisms while validating boundary-local composition.',
    secondaryFlow: 'Secondary flow: inspect policy organisms and regulatory structure.',
  }),
  registryTier: 'core',
  official: true,
};

export const mapStudioAppDefinition: VisorAppDefinition = {
  id: 'map-studio',
  label: 'Map Studio',
  description: 'Curate map surfacing and spatial arrangement for intentional navigation.',
  icon: MapStudioAppIcon,
  component: createCoreAppComponent({
    appName: 'Map Studio',
    purpose: 'Shape spatial-map organisms through deliberate surfacing and arrangement.',
    primaryFlow: 'Primary flow: surface organisms onto a map with coordinates and curatorial framing.',
    secondaryFlow: 'Secondary flow: tune map coherence so visitors can orient quickly.',
  }),
  registryTier: 'core',
  official: true,
};

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

export const queryExplorerAppDefinition: VisorAppDefinition = {
  id: 'query-explorer',
  label: 'Query Explorer',
  description: 'Cross-cutting retrieval across organisms, relationships, and composition.',
  icon: QueryExplorerAppIcon,
  component: createCoreAppComponent({
    appName: 'Query Explorer',
    purpose: 'Search and filter across boundaries to find what needs tending now.',
    primaryFlow: 'Primary flow: run scoped queries over organisms, relationships, and visibility.',
    secondaryFlow: 'Secondary flow: open the target app directly from result context.',
  }),
  registryTier: 'core',
  official: true,
};

export const coreVisorAppDefinitions: ReadonlyArray<VisorAppDefinition> = [
  organismViewAppDefinition as VisorAppDefinition,
  proposalWorkbenchAppDefinition as VisorAppDefinition,
  integrationQueueAppDefinition,
  systemsViewAppDefinition,
  mapStudioAppDefinition,
  vitalityEventStreamAppDefinition,
  queryExplorerAppDefinition,
];
