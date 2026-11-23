import { createTestServices, lessonBundle } from '@/testing/fake-content-server';

describe('content sync', () => {
  it('downloads new and changed lessons automatically on Wi-Fi', async () => {
    const { server, contentSync, library } = createTestServices({ connection: 'unmetered' });
    server.publish(lessonBundle('al-bar', 2, 'Al bar (nuovo)'));
    server.publish(lessonBundle('alla-stazione', 1, 'Alla stazione'));
    const installed = jest.fn();
    library.onInstalled(installed);

    await contentSync.check();

    expect((await library.listLessons()).map((lesson) => lesson.titleItalian)).toEqual([
      'Al bar (nuovo)',
      'Alla stazione',
    ]);
    expect(installed).toHaveBeenCalledWith(['al-bar', 'alla-stazione']);
    expect(contentSync.getState()).toMatchObject({ phase: 'idle', offered: [], error: null });
  });

  it('offers updates on mobile data and downloads them once the student confirms', async () => {
    const { server, contentSync, library } = createTestServices({ connection: 'metered' });
    server.publish(lessonBundle('alla-stazione', 1, 'Alla stazione'));

    await contentSync.check();

    expect(contentSync.getState().offered.map((offer) => offer.lesson.id)).toEqual([
      'alla-stazione',
    ]);
    expect(server.api.fetchLessonVersion).not.toHaveBeenCalled();

    await contentSync.downloadOffered();

    expect(contentSync.getState().offered).toEqual([]);
    expect(await library.listLessons()).toHaveLength(2);
  });

  it('follows the student\'s "always" policy on mobile data', async () => {
    const { server, contentSync, library, ready } = createTestServices({
      connection: 'metered',
      policy: 'always',
    });
    await ready;
    server.publish(lessonBundle('alla-stazione', 1));

    await contentSync.check();

    expect(await library.listLessons()).toHaveLength(2);
  });

  it('does not repeat a dismissed offer until the student checks manually', async () => {
    const { server, contentSync } = createTestServices({ connection: 'metered' });
    server.publish(lessonBundle('alla-stazione', 1));
    await contentSync.check();

    contentSync.dismissOffer();
    await contentSync.check();
    expect(contentSync.getState().offered).toEqual([]);

    await contentSync.check({ manual: true });
    expect(contentSync.getState().offered).toHaveLength(1);
  });

  it('never swaps a lesson that is open; installs it when the student leaves', async () => {
    const { server, contentSync, library, holds } = createTestServices();
    server.publish(lessonBundle('al-bar', 2, 'Al bar (nuovo)'));
    const release = holds.hold('al-bar');

    await contentSync.check();
    expect((await library.getLessonBundle('al-bar')).lesson.version).toBe(1);

    release();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect((await library.getLessonBundle('al-bar')).lesson.version).toBe(2);
  });

  it('rejects downloaded content that fails validation and keeps the installed lesson', async () => {
    const { server, contentSync, library, telemetry } = createTestServices();
    const broken = lessonBundle('al-bar', 2);
    server.publish({ ...broken, lexemes: [{ id: 'x' }] } as unknown as typeof broken);

    await contentSync.check();

    expect((await library.getLessonBundle('al-bar')).lesson.version).toBe(1);
    expect(telemetry.captureError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'validation' }),
      expect.objectContaining({ lessonId: 'al-bar' }),
    );
  });

  it('reports failures only for checks the student started', async () => {
    const { server, contentSync, network } = createTestServices();
    server.publish(lessonBundle('alla-stazione', 1));
    server.failDownloadsOf('alla-stazione');

    await contentSync.check();
    expect(contentSync.getState().error).toBeNull();

    await contentSync.check({ manual: true });
    expect(contentSync.getState().error).toMatchObject({ kind: 'network' });

    network.connection = 'offline';
    await contentSync.check({ manual: true });
    expect(contentSync.getState().error).toMatchObject({ kind: 'network' });
    expect(contentSync.getState().lastCheckedAt).not.toBeNull();
  });
});
