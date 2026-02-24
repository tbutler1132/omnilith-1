/**
 * API client for web-next.
 *
 * Provides one typed fetch helper that routes through the local Vite proxy,
 * keeping rendering modules decoupled from HTTP implementation details.
 */

import { clearSessionId, readSessionId } from './session.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function resolvePublicRetryPath(path: string, method: string | undefined): string | null {
  const normalizedMethod = (method ?? 'GET').toUpperCase();
  if (normalizedMethod !== 'GET') {
    return null;
  }

  const normalizedPath = normalizeApiPath(path);
  if (normalizedPath.startsWith('/public/')) {
    return null;
  }

  if (!normalizedPath.startsWith('/organisms/')) {
    return null;
  }

  return `/public${normalizedPath}`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = normalizeApiPath(path);
  const sessionId = readSessionId();
  const headers = new Headers(options.headers);

  if (sessionId) {
    headers.set('Authorization', `Bearer ${sessionId}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(`/api${normalizedPath}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && sessionId) {
    const retryPath = resolvePublicRetryPath(normalizedPath, options.method);
    if (retryPath) {
      clearSessionId();
      const retryHeaders = new Headers(options.headers);
      retryHeaders.delete('Authorization');

      if (!retryHeaders.has('Content-Type') && options.body) {
        retryHeaders.set('Content-Type', 'application/json');
      }

      response = await fetch(`/api${retryPath}`, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, payload.error ?? response.statusText);
  }

  return response.json() as Promise<T>;
}
