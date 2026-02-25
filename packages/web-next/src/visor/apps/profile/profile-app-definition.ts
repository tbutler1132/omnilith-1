/**
 * Profile app definition.
 *
 * Registers metadata and render module for the profile visor app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { ProfileApp } from './profile-app.js';
import { ProfileAppIcon } from './profile-app-icon.js';

export const profileAppDefinition: VisorAppDefinition = {
  id: 'profile',
  label: 'Profile',
  description: 'Identity and practice snapshot app.',
  icon: ProfileAppIcon,
  component: ProfileApp,
};
