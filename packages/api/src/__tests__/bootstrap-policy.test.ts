/**
 * Bootstrap policy tests — ensure startup seeding follows environment intent.
 *
 * These checks keep private alpha staging convenient while preventing
 * accidental demo-data seeding in production runtime.
 */

import { describe, expect, it } from 'vitest';
import { resolveBootstrapPolicy } from '../runtime/bootstrap-policy.js';

describe('bootstrap policy', () => {
  it('staging runtime enables bootstrap seed by default', () => {
    const result = resolveBootstrapPolicy({
      runtimeEnvironment: 'staging',
      nodeEnvironment: 'production',
      databaseUrl: 'postgres://staging.db.example.com:5432/omnilith_staging',
    });

    expect(result.runtimeEnvironment).toBe('staging');
    expect(result.bootstrapSeedEnabled).toBe(true);
  });

  it('production runtime disables bootstrap seed by default', () => {
    const result = resolveBootstrapPolicy({
      runtimeEnvironment: 'production',
      nodeEnvironment: 'production',
      databaseUrl: 'postgres://prod.db.example.com:5432/omnilith_prod',
    });

    expect(result.runtimeEnvironment).toBe('production');
    expect(result.bootstrapSeedEnabled).toBe(false);
  });

  it('production runtime refuses explicit bootstrap seed enablement', () => {
    expect(() =>
      resolveBootstrapPolicy({
        runtimeEnvironment: 'production',
        nodeEnvironment: 'production',
        databaseUrl: 'postgres://prod.db.example.com:5432/omnilith_prod',
        bootstrapSeedEnabled: 'true',
      }),
    ).toThrow(/Refusing bootstrap seed in production runtime/);
  });

  it('local database infers local runtime when runtime is omitted', () => {
    const result = resolveBootstrapPolicy({
      nodeEnvironment: 'development',
      databaseUrl: 'postgres://localhost:5432/omnilith_dev',
    });

    expect(result.runtimeEnvironment).toBe('local');
    expect(result.bootstrapSeedEnabled).toBe(true);
  });

  it('remote database infers production runtime when runtime is omitted', () => {
    const result = resolveBootstrapPolicy({
      nodeEnvironment: 'development',
      databaseUrl: 'postgres://staging.db.example.com:5432/omnilith_staging',
    });

    expect(result.runtimeEnvironment).toBe('production');
    expect(result.bootstrapSeedEnabled).toBe(false);
  });

  it('explicit bootstrap seed flag can disable staging seeding', () => {
    const result = resolveBootstrapPolicy({
      runtimeEnvironment: 'staging',
      nodeEnvironment: 'production',
      databaseUrl: 'postgres://staging.db.example.com:5432/omnilith_staging',
      bootstrapSeedEnabled: 'false',
    });

    expect(result.runtimeEnvironment).toBe('staging');
    expect(result.bootstrapSeedEnabled).toBe(false);
  });
});
