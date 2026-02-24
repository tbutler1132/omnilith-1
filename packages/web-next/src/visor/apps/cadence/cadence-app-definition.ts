/**
 * Boundary cadence app definition.
 *
 * Registers metadata and render module for the Move 48 boundary cadence app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { CadenceApp } from './cadence-app.js';

export const cadenceAppDefinition: VisorAppDefinition = {
  id: 'cadence',
  label: 'Cadence',
  description: 'View Move 48 boundary cadence organisms composed in this boundary.',
  component: CadenceApp,
};
