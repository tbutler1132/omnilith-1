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

  it('retries public organism reads after 401 and clears stale session ids', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'stale-session'),
      removeItem,
    } satisfies Pick<Storage, 'getItem' | 'removeItem'>);

    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            organism: { id: 'example', name: 'Example' },
            currentState: null,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{
      organism: { id: string; name: string };
      currentState: null;
    }>('/organisms/example');

    expect(result.organism.id).toBe('example');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/organisms/example');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/public/organisms/example');

    const firstHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    const secondHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(firstHeaders.get('Authorization')).toBe('Bearer stale-session');
    expect(secondHeaders.get('Authorization')).toBeNull();
    expect(removeItem).toHaveBeenCalledWith('sessionId');
  });

  it('does not retry public path for non-GET requests', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'session-123'),
      removeItem,
    } satisfies Pick<Storage, 'getItem' | 'removeItem'>);

    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiFetch('/organisms/example', {
        method: 'POST',
        body: JSON.stringify({ name: 'Example' }),
      }),
    ).rejects.toEqual(new ApiError(401, 'Unauthorized'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(removeItem).not.toHaveBeenCalled();
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
