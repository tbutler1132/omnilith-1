/**
 * CLI entrypoint for one generic regulator cycle.
 */

import { createContainer } from '../container.js';
import { createDatabase } from '../db/connection.js';
import { runConfiguredRegulatorCycle } from './run-configured-regulator-cycle.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith_dev';

async function run() {
  const db = createDatabase(databaseUrl);
  const container = createContainer(db);
  const result = await runConfiguredRegulatorCycle(container);

  console.log('[regulator] boundariesProcessed:', result.boundariesProcessed);
  console.log('[regulator] variableUpdates:', result.variableUpdates);
  console.log('[regulator] responsePolicyUpdates:', result.responsePolicyUpdates);
  console.log('[regulator] skippedManagedVariables:', result.skippedManagedVariables);
  console.log('[regulator] directActionExecutions:', result.directActionExecutions);
  console.log('[regulator] proposalActionsOpened:', result.proposalActionsOpened);
  console.log('[regulator] declinedActions:', result.declinedActions);
  console.log('[regulator] failedActions:', result.failedActions);

  for (const boundary of result.boundaries) {
    console.log(
      '[regulator] boundary:',
      boundary.boundaryOrganismId,
      `variableUpdates=${boundary.variableUpdates}`,
      `responsePolicyUpdates=${boundary.responsePolicyUpdates}`,
      `skippedManagedVariables=${boundary.skippedManagedVariables}`,
      `directActionExecutions=${boundary.directActionExecutions}`,
      `proposalActionsOpened=${boundary.proposalActionsOpened}`,
      `declinedActions=${boundary.declinedActions}`,
      `failedActions=${boundary.failedActions}`,
    );
  }
}

run().catch((error) => {
  console.error('regulator cycle failed:', error);
  process.exit(1);
});
