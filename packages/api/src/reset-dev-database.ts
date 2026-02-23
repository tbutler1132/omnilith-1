/**
 * Dev database reset — destroys and recreates local development data.
 *
 * This script exists to make local experimentation reversible.
 * It drops the public schema, reapplies migrations, and reseeds baseline
 * organisms so the environment can always be restored to a known state.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createContainer } from './container.js';
import * as schema from './db/schema.js';
import { seedWorldMap } from './seed.js';
import { seedDev } from './seed-dev.js';

const ALLOW_RESET_ENV = 'OMNILITH_ALLOW_DB_RESET';
const RUNTIME_ENV = 'OMNILITH_RUNTIME_ENV';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);

function assertSafeToReset(databaseUrl: string): void {
  if (process.env[ALLOW_RESET_ENV] !== 'true') {
    throw new Error(`Refusing reset. Re-run with ${ALLOW_RESET_ENV}=true to confirm this destructive local operation.`);
  }

  if (process.env[RUNTIME_ENV] !== 'local') {
    throw new Error(
      `Refusing reset unless ${RUNTIME_ENV}=local. Current value: ${process.env[RUNTIME_ENV] ?? '(unset)'}.`,
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing reset while NODE_ENV is production.');
  }

  const parsed = new URL(databaseUrl);
  if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(
      `Refusing reset for non-local database host "${parsed.hostname}". Use a local development database only.`,
    );
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/omnilith_dev';
  assertSafeToReset(databaseUrl);

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });
  const container = createContainer(db);
  const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');

  console.log('Resetting development database...');
  // Drizzle tracks migration history in the "drizzle" schema.
  // Clear it so migrations always replay after dropping public.
  await client.unsafe('drop schema if exists drizzle cascade');
  await client.unsafe('drop schema if exists public cascade');
  await client.unsafe('create schema public');
  await migrate(db, { migrationsFolder });

  const worldMapId = await seedWorldMap(container);
  await seedDev(container);
  await client.end();

  console.log(`Development database reset complete. World map: ${worldMapId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
