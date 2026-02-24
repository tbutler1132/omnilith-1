/**
 * Open app organism target resolver.
 *
 * Keeps app-targeting logic centralized so organism-scoped apps can use the
 * active organism context (interior first, then boundary map context) before
 * falling back to URL-persisted targeting.
 */

interface ResolveOpenAppTargetOrganismIdInput {
  readonly appId: string;
  readonly enteredOrganismId: string | null;
  readonly boundaryOrganismId: string | null;
  readonly visorOrganismId: string | null;
  readonly personalOrganismId: string | null;
}

function isOrganismScopedApp(appId: string): boolean {
  return appId === 'organism' || appId === 'cadence';
}

export function resolveOpenAppTargetOrganismId(input: ResolveOpenAppTargetOrganismIdInput): string | null {
  if (input.appId === 'cadence' && input.personalOrganismId) {
    return input.personalOrganismId;
  }

  if (!isOrganismScopedApp(input.appId)) {
    return input.visorOrganismId;
  }

  return input.enteredOrganismId ?? input.boundaryOrganismId ?? input.visorOrganismId;
}
