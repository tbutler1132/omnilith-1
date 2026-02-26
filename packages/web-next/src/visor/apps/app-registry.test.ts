import { describe, expect, it } from 'vitest';
import {
  clearVisorAppRoutes,
  listCoreVisorApps,
  listExtraVisorApps,
  listVisorApps,
  resolveVisorApp,
} from './app-registry.js';

describe('visor app registry', () => {
  it('lists registered visor apps', () => {
    const apps = listVisorApps();
    expect(apps.length).toBeGreaterThan(0);
    expect(apps[0]?.id).toBe('organism-view');
    expect(apps.some((app) => app.id === 'proposal-workbench')).toBe(true);
    expect(apps.some((app) => app.id === 'map-studio')).toBe(true);
    expect(apps.every((app) => typeof app.icon === 'function')).toBe(true);
    expect(apps.every((app) => app.official)).toBe(true);
  });

  it('resolves explicit app ids and falls back to the default app', () => {
    expect(resolveVisorApp('organism-view').id).toBe('organism-view');
    expect(resolveVisorApp(null).id).toBe('organism-view');
    expect(resolveVisorApp('missing').id).toBe('organism-view');
  });

  it('separates core and extra app tiers', () => {
    const coreApps = listCoreVisorApps();
    const extraApps = listExtraVisorApps();

    expect(coreApps).toHaveLength(7);
    expect(coreApps.every((app) => app.registryTier === 'core')).toBe(true);
    expect(extraApps.every((app) => app.registryTier === 'extra')).toBe(true);
    expect(extraApps.map((app) => app.id)).toEqual(expect.arrayContaining(['profile', 'organism', 'cadence']));
  });

  it('clears app-specific route params', () => {
    const cleared = clearVisorAppRoutes(new URLSearchParams('visor=open&app=organism&organismTab=my-organisms'));

    expect(cleared.get('organismTab')).toBeNull();
    expect(cleared.get('app')).toBe('organism');
  });
});
