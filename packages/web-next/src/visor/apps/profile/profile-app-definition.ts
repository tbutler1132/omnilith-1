/**
 * Profile app definition.
 *
 * Registers metadata and render module for the profile visor app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { ProfileApp } from './profile-app.js';

export const profileAppDefinition: VisorAppDefinition = {
  id: 'profile',
  label: 'Profile',
  description: 'Identity and practice snapshot app.',
  component: ProfileApp,
};
