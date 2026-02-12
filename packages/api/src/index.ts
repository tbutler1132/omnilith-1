/**
 * @omnilith/api — HTTP adapter for the kernel.
 *
 * Standalone server (Hono + Node) connecting the kernel to the
 * outside world through PostgreSQL and HTTP.
 */

import { serve } from '@hono/node-server';
import { createDatabase } from './db/connection.js';
import { createContainer } from './container.js';
import { createServer } from './server.js';

const port = parseInt(process.env.PORT ?? '3000', 10);
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith';

const db = createDatabase(databaseUrl);
const container = createContainer(db);
const app = createServer(container);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Omnilith API listening on http://localhost:${info.port}`);
});
