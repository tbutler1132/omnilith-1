/**
 * Organism app definition.
 *
 * Registers metadata and render module for the first real Organism app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { OrganismApp } from './organism-app.js';

export const organismAppDefinition: VisorAppDefinition = {
  id: 'organism',
  label: 'Organism',
  description: 'Simple overview of one organism state payload.',
  component: OrganismApp,
};
