import { describe, expect, it } from 'vitest';
import { resolveOpenAppTargetOrganismId } from './resolve-open-app-target-organism-id.js';

describe('resolveOpenAppTargetOrganismId', () => {
  it('prioritizes entered organism for organism-scoped apps', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'organism',
      enteredOrganismId: 'org-entered',
      boundaryOrganismId: 'org-boundary',
      visorOrganismId: 'org-route',
    });

    expect(resolved).toBe('org-entered');
  });

  it('falls back to boundary context for cadence when no entered organism exists', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'cadence',
      enteredOrganismId: null,
      boundaryOrganismId: 'org-community',
      visorOrganismId: null,
    });

    expect(resolved).toBe('org-community');
  });

  it('uses URL-persisted target for non organism-scoped apps', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'profile',
      enteredOrganismId: 'org-entered',
      boundaryOrganismId: 'org-boundary',
      visorOrganismId: 'org-route',
    });

    expect(resolved).toBe('org-route');
  });
});
