/**
 * @omnilith/api — HTTP adapter for the kernel.
 *
 * Standalone server (Hono + Node) connecting the kernel to the
 * outside world through PostgreSQL and HTTP.
 */

import { serve } from '@hono/node-server';
import { createContainer } from './container.js';
import { createDatabase } from './db/connection.js';
import { seedWorldMap } from './seed.js';
import { seedDev } from './seed-dev.js';
import { createServer } from './server.js';

const port = parseInt(process.env.PORT ?? '3000', 10);
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith_dev';

const db = createDatabase(databaseUrl);
const container = createContainer(db);

async function start() {
  const worldMapId = await seedWorldMap(container);
  console.log(`World map seeded: ${worldMapId}`);

  // Seed profile (default: focused v1-demo, configurable via OMNILITH_SEED_PROFILE)
  await seedDev(container);

  const app = createServer(container, { worldMapId });

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Omnilith API listening on http://localhost:${info.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
