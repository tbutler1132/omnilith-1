/**
 * API client for web-next.
 *
 * Provides one typed fetch helper that routes through the local Vite proxy,
 * keeping rendering modules decoupled from HTTP implementation details.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sessionId = localStorage.getItem('sessionId');
  const headers = new Headers(options.headers);

  if (sessionId) {
    headers.set('Authorization', `Bearer ${sessionId}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, payload.error ?? response.statusText);
  }

  return response.json() as Promise<T>;
}
