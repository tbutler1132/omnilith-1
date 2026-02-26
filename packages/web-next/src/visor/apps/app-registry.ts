/**
 * Visor app registry.
 *
 * Central list of open-visor apps. Keeps app discovery and fallback logic
 * outside the shell and preserves app module isolation.
 */

import type { VisorAppDefinition } from './app-contract.js';
import { cadenceAppDefinition } from './cadence/index.js';
import { coreVisorAppDefinitions } from './core/index.js';
import { organismAppDefinition } from './organism/index.js';
import { profileAppDefinition } from './profile/index.js';
import { textEditorAppDefinition } from './text-editor/index.js';

const VISOR_APPS: ReadonlyArray<VisorAppDefinition> = [
  ...coreVisorAppDefinitions,
  profileAppDefinition,
  organismAppDefinition as VisorAppDefinition,
  cadenceAppDefinition,
  textEditorAppDefinition,
];

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

export function listCoreVisorApps(): ReadonlyArray<VisorAppDefinition> {
  return VISOR_APPS.filter((app) => app.registryTier === 'core');
}

export function listExtraVisorApps(): ReadonlyArray<VisorAppDefinition> {
  return VISOR_APPS.filter((app) => app.registryTier === 'extra');
}

export function resolveVisorApp(appId: string | null): VisorAppDefinition {
  if (!appId) {
    return fallbackVisorApp();
  }

  return VISOR_APPS.find((app) => app.id === appId) ?? fallbackVisorApp();
}

export function clearVisorAppRoutes(searchParams: URLSearchParams): URLSearchParams {
  let next = new URLSearchParams(searchParams);

  for (const app of VISOR_APPS) {
    if (!app.routeCodec?.clearRoute) {
      continue;
    }

    next = app.routeCodec.clearRoute(next);
  }

  return next;
}
