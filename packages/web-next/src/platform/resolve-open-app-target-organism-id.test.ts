import { describe, expect, it } from 'vitest';
import { resolveOpenAppTargetOrganismId } from './resolve-open-app-target-organism-id.js';

describe('resolveOpenAppTargetOrganismId', () => {
  it('prioritizes entered organism for organism-scoped apps', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'organism',
      enteredOrganismId: 'org-entered',
      boundaryOrganismId: 'org-boundary',
      visorOrganismId: 'org-route',
      personalOrganismId: 'org-personal',
    });

    expect(resolved).toBe('org-entered');
  });

  it('prefers personal organism for cadence when available', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'cadence',
      enteredOrganismId: 'org-entered',
      boundaryOrganismId: 'org-community',
      visorOrganismId: 'org-route',
      personalOrganismId: 'org-personal',
    });

    expect(resolved).toBe('org-personal');
  });

  it('falls back to boundary context for cadence when no personal or entered organism exists', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'cadence',
      enteredOrganismId: null,
      boundaryOrganismId: 'org-community',
      visorOrganismId: null,
      personalOrganismId: null,
    });

    expect(resolved).toBe('org-community');
  });

  it('uses URL-persisted target for non organism-scoped apps', () => {
    const resolved = resolveOpenAppTargetOrganismId({
      appId: 'profile',
      enteredOrganismId: 'org-entered',
      boundaryOrganismId: 'org-boundary',
      visorOrganismId: 'org-route',
      personalOrganismId: 'org-personal',
    });

    expect(resolved).toBe('org-route');
  });
});
