/**
 * Bootstrap policy — controls startup seeding by runtime environment.
 *
 * This keeps environment intent explicit so staging can run demo seed data
 * while production stays protected from bootstrap seeding.
 */

export type RuntimeEnvironment = 'local' | 'staging' | 'production';

export interface BootstrapPolicy {
  runtimeEnvironment: RuntimeEnvironment;
  bootstrapSeedEnabled: boolean;
}

const LOCAL_DATABASE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);

function parseRuntimeEnvironment(rawValue: string | undefined): RuntimeEnvironment | null {
  if (!rawValue) return null;
  if (rawValue === 'local' || rawValue === 'staging' || rawValue === 'production') {
    return rawValue;
  }
  return null;
}

function parseBooleanFlag(rawValue: string | undefined): boolean | null {
  if (!rawValue) return null;
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
}

function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    return LOCAL_DATABASE_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}

function inferRuntimeEnvironment(
  rawRuntimeEnvironment: string | undefined,
  nodeEnvironment: string | undefined,
  databaseUrl: string,
): RuntimeEnvironment {
  const explicit = parseRuntimeEnvironment(rawRuntimeEnvironment);
  if (explicit) return explicit;

  if (nodeEnvironment === 'production') {
    return 'production';
  }

  return isLocalDatabaseUrl(databaseUrl) ? 'local' : 'production';
}

export function resolveBootstrapPolicy(input: {
  runtimeEnvironment?: string;
  nodeEnvironment?: string;
  databaseUrl: string;
  bootstrapSeedEnabled?: string;
}): BootstrapPolicy {
  const runtimeEnvironment = inferRuntimeEnvironment(
    input.runtimeEnvironment,
    input.nodeEnvironment,
    input.databaseUrl,
  );

  const explicitSeedFlag = parseBooleanFlag(input.bootstrapSeedEnabled);
  const defaultSeedEnabled = runtimeEnvironment !== 'production';
  const bootstrapSeedEnabled = explicitSeedFlag ?? defaultSeedEnabled;

  if (runtimeEnvironment === 'production' && bootstrapSeedEnabled) {
    throw new Error(
      'Refusing bootstrap seed in production runtime. Set OMNILITH_ENABLE_BOOTSTRAP_SEED=false or use OMNILITH_RUNTIME_ENV=staging/local.',
    );
  }

  return {
    runtimeEnvironment,
    bootstrapSeedEnabled,
  };
}
