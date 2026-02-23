/**
 * Visor route contract for URL-addressable app mode.
 *
 * Defines a small, deterministic parser now so later slices can wire deep
 * links without redesigning URL semantics mid-migration.
 */

export type VisorMode = 'closed' | 'open';

export interface VisorRoute {
  readonly mode: VisorMode;
  readonly appId: string | null;
  readonly organismId: string | null;
}

export function parseVisorRoute(searchParams: URLSearchParams): VisorRoute {
  const mode = searchParams.get('visor') === 'open' ? 'open' : 'closed';
  const appId = sanitizeValue(searchParams.get('app'));
  const organismId = sanitizeValue(searchParams.get('organism'));

  return {
    mode,
    appId,
    organismId,
  };
}

function sanitizeValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
