/**
 * @omnilith/api — HTTP adapter for the kernel.
 *
 * Standalone server (Hono + Node) connecting the kernel to the
 * outside world through PostgreSQL and HTTP.
 */

import { serve } from '@hono/node-server';
import { createContainer } from './container.js';
import { createDatabase } from './db/connection.js';
import { resolveBootstrapPolicy } from './runtime/bootstrap-policy.js';
import { seedWorldMap } from './seed.js';
import { seedDev } from './seed-dev.js';
import { createServer } from './server.js';

const port = parseInt(process.env.PORT ?? '3000', 10);
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith_dev';

const db = createDatabase(databaseUrl);
const container = createContainer(db);

async function start() {
  const bootstrapPolicy = resolveBootstrapPolicy({
    runtimeEnvironment: process.env.OMNILITH_RUNTIME_ENV,
    nodeEnvironment: process.env.NODE_ENV,
    databaseUrl,
    bootstrapSeedEnabled: process.env.OMNILITH_ENABLE_BOOTSTRAP_SEED,
  });

  console.log(`Runtime environment: ${bootstrapPolicy.runtimeEnvironment}`);

  const worldMapId = await seedWorldMap(container);
  console.log(`World map seeded: ${worldMapId}`);

  if (bootstrapPolicy.bootstrapSeedEnabled) {
    // Seed profile (default: focused v1-demo, configurable via OMNILITH_SEED_PROFILE)
    await seedDev(container);
  } else {
    console.log('Bootstrap seed disabled for this runtime.');
  }

  for (const line of container.githubPlugin.describeRuntime()) {
    console.log(line);
  }

  const app = createServer(container, { worldMapId });

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Omnilith API listening on http://localhost:${info.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
