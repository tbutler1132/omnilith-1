import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './api-client.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('routes through /api and attaches authorization + json content type when needed', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'session-123'),
    } satisfies Pick<Storage, 'getItem'>);

    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ ok: boolean }>('/organisms/example', {
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organisms/example',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer session-123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with response fallback message when error payload is not json', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
    } satisfies Pick<Storage, 'getItem'>);

    vi.stubGlobal(
      'fetch',
      vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => {
        return new Response('not-json', {
          status: 503,
          statusText: 'Service unavailable',
        });
      }),
    );

    await expect(apiFetch('/platform/world-map')).rejects.toEqual(new ApiError(503, 'Service unavailable'));
  });
});
