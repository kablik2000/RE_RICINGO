import { createContentApi } from './content-api';

const BASE = 'http://10.0.2.2:8000';
const CATALOG_ENTRY = {
  id: 'al-bar',
  version: 2,
  checksum: 'abc',
  publishedAt: '2026-11-23T10:00:00+00:00',
  titleItalian: 'Al bar',
  titleCzech: 'V kavárně',
  level: 'A1',
};

function respondWith(body: unknown, status = 200) {
  return jest.fn(() => Promise.resolve(Response.json(body, { status })));
}

describe('content API client', () => {
  it('sends the signed-in student token, so recommended lessons are listed too', async () => {
    const fetchImpl = respondWith({ lessons: [] });

    await createContentApi(BASE, fetchImpl, () => Promise.resolve('tok-1')).fetchCatalog();
    await createContentApi(BASE, fetchImpl).fetchCatalog();

    const headers = fetchImpl.mock.calls.map(
      (call) => (call as unknown as [string, RequestInit])[1].headers as Record<string, string>,
    );
    expect(headers[0]?.Authorization).toBe('Bearer tok-1');
    expect(headers[1]?.Authorization).toBeUndefined();
  });

  it('reads the catalog of published lessons', async () => {
    const fetchImpl = respondWith({ lessons: [CATALOG_ENTRY] });

    await expect(createContentApi(BASE, fetchImpl).fetchCatalog()).resolves.toEqual([
      CATALOG_ENTRY,
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(`${BASE}/api/v1/content/lessons`, expect.anything());
  });

  it('downloads one published version', async () => {
    const fetchImpl = respondWith({ lessonId: 'al-bar', version: 2, checksum: 'abc', bundle: {} });

    await expect(
      createContentApi(BASE, fetchImpl).fetchLessonVersion('al-bar', 2),
    ).resolves.toEqual({ checksum: 'abc', bundle: {} });
  });

  it('rejects an answer for another lesson or version', async () => {
    const fetchImpl = respondWith({ lessonId: 'al-bar', version: 1, checksum: 'abc', bundle: {} });

    await expect(
      createContentApi(BASE, fetchImpl).fetchLessonVersion('al-bar', 2),
    ).rejects.toMatchObject({ kind: 'validation' });
  });

  it('maps failures to AppErrors', async () => {
    const unreachable = jest.fn(() => Promise.reject(new TypeError('Network request failed')));

    await expect(createContentApi(BASE, unreachable).fetchCatalog()).rejects.toMatchObject({
      kind: 'network',
    });
    await expect(
      createContentApi(BASE, respondWith({ error: {} }, 404)).fetchCatalog(),
    ).rejects.toMatchObject({ kind: 'notFound' });
    await expect(
      createContentApi(BASE, respondWith({ lessons: 'nope' })).fetchCatalog(),
    ).rejects.toMatchObject({ kind: 'validation' });
  });
});
