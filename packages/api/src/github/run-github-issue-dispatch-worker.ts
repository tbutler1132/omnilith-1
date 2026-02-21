/**
 * CLI entrypoint for processing queued GitHub issue dispatches.
 */

import { createContainer } from '../container.js';
import { createDatabase } from '../db/connection.js';
import { processGitHubIssueDispatchBatch } from './github-issue-dispatch-worker.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith_dev';

async function run() {
  const db = createDatabase(databaseUrl);
  const container = createContainer(db);
  const processed = await processGitHubIssueDispatchBatch(container);
  console.log(`github issue dispatch worker processed ${processed} row(s)`);
}

run().catch((error) => {
  console.error('github issue dispatch worker failed:', error);
  process.exit(1);
});
