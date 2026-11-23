import { apiBaseUrl, fetchApiStatus } from './api-status';

function respondWith(body: unknown, status = 200): typeof fetch {
  return vi.fn(() => Promise.resolve(Response.json(body, { status })));
}

describe('fetchApiStatus', () => {
  it('is online when the API and its database are healthy', async () => {
    const fetchImpl = respondWith({ status: 'ok', database: 'ok' });

    await expect(fetchApiStatus('http://api', fetchImpl)).resolves.toEqual({ kind: 'online' });
    expect(fetchImpl).toHaveBeenCalledWith('http://api/api/v1/health', { cache: 'no-store' });
  });

  it('is degraded when the database is unavailable', async () => {
    const fetchImpl = respondWith({ status: 'degraded', database: 'unavailable' }, 503);

    await expect(fetchApiStatus('http://api', fetchImpl)).resolves.toEqual({ kind: 'degraded' });
  });

  it('is offline when the API cannot be reached or answers nonsense', async () => {
    const unreachable = vi.fn(() => Promise.reject(new TypeError('fetch failed')));

    await expect(fetchApiStatus('http://api', unreachable)).resolves.toEqual({
      kind: 'offline',
      reason: 'fetch failed',
    });
    await expect(
      fetchApiStatus('http://api', respondWith({ hello: 'world' })),
    ).resolves.toMatchObject({ kind: 'offline' });
  });

  it('uses RICI_API_URL or the local Docker stack', () => {
    expect(apiBaseUrl({ RICI_API_URL: 'https://api.example.test' })).toBe(
      'https://api.example.test',
    );
    expect(apiBaseUrl({})).toBe('http://localhost:8000');
  });
});
