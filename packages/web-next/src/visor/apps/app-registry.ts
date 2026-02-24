/**
 * Visor app registry.
 *
 * Central list of open-visor apps. Keeps app discovery and fallback logic
 * outside the shell and preserves app module isolation.
 */

import type { VisorAppDefinition } from './app-contract.js';
import { organismAppDefinition } from './organism/index.js';
import { profileAppDefinition } from './profile/index.js';

const VISOR_APPS: ReadonlyArray<VisorAppDefinition> = [profileAppDefinition, organismAppDefinition];

function fallbackVisorApp(): VisorAppDefinition {
  const fallback = VISOR_APPS[0];
  if (!fallback) {
    throw new Error('Visor app registry is empty.');
  }

  return fallback;
}

export function listVisorApps(): ReadonlyArray<VisorAppDefinition> {
  return VISOR_APPS;
}

export function resolveVisorApp(appId: string | null): VisorAppDefinition {
  if (!appId) {
    return fallbackVisorApp();
  }

  return VISOR_APPS.find((app) => app.id === appId) ?? fallbackVisorApp();
}
