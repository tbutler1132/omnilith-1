/**
 * Public-aware API path resolver.
 *
 * Routes requests to `/public` endpoints when no session is present,
 * keeping unauthenticated read-path behavior consistent across modules.
 */

import { hasSessionId } from './session.js';

function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function resolvePublicApiPath(path: string): string {
  const normalizedPath = normalizeApiPath(path);

  if (normalizedPath.startsWith('/public/')) {
    return normalizedPath;
  }

  return hasSessionId() ? normalizedPath : `/public${normalizedPath}`;
}
