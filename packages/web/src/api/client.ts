/**
 * API client — typed fetch wrapper for all API calls.
 *
 * Reads sessionId from localStorage, adds Authorization header,
 * returns typed JSON responses.
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

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}
