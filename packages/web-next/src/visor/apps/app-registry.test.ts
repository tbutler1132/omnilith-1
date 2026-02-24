import { describe, expect, it } from 'vitest';
import { listVisorApps, resolveVisorApp } from './app-registry.js';

describe('visor app registry', () => {
  it('lists registered visor apps', () => {
    const apps = listVisorApps();
    expect(apps.length).toBeGreaterThan(0);
    expect(apps[0]?.id).toBe('profile');
    expect(apps.some((app) => app.id === 'organism')).toBe(true);
    expect(apps.some((app) => app.id === 'cadence')).toBe(true);
  });

  it('resolves explicit app ids and falls back to the default app', () => {
    expect(resolveVisorApp('profile').id).toBe('profile');
    expect(resolveVisorApp(null).id).toBe('profile');
    expect(resolveVisorApp('missing').id).toBe('profile');
  });
});
