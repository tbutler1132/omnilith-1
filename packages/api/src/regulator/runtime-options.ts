/**
 * Regulator runtime options — environment to runtime option mapping.
 *
 * Keeps command-line and process environment concerns outside the
 * generic runtime so the runtime stays deterministic and reusable.
 */

import type { OrganismId, UserId } from '@omnilith/kernel';
import type { RegulatorRuntimeOptions } from './regulator-runtime.js';

function parseBoundaryOrganismsFromEnv(): ReadonlyArray<OrganismId> | undefined {
  const raw = process.env.REGULATOR_BOUNDARY_ORGANISM_IDS?.trim();
  if (!raw) {
    return undefined;
  }

  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0) as OrganismId[];

  return values.length > 0 ? values : undefined;
}

function parseRunnerUserIdFromEnv(): UserId | undefined {
  const value = process.env.REGULATOR_RUNNER_USER_ID?.trim();
  if (!value) {
    return undefined;
  }

  return value as UserId;
}

export function runtimeOptionsFromEnv(): RegulatorRuntimeOptions {
  return {
    boundaryOrganismIds: parseBoundaryOrganismsFromEnv(),
    runnerUserId: parseRunnerUserIdFromEnv(),
  };
}
