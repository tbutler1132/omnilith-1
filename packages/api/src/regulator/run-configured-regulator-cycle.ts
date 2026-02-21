/**
 * Configured regulator runner facade.
 *
 * Resolves runtime options from environment and delegates to the
 * generic regulator cycle runtime.
 */

import type { Container } from '../container.js';
import { type RegulatorCycleResult, runRegulatorCycle } from './regulator-runtime.js';
import { runtimeOptionsFromEnv } from './runtime-options.js';

export type ConfiguredRegulatorCycleResult = RegulatorCycleResult;

export async function runConfiguredRegulatorCycle(container: Container): Promise<ConfiguredRegulatorCycleResult> {
  return runRegulatorCycle(container, runtimeOptionsFromEnv());
}
