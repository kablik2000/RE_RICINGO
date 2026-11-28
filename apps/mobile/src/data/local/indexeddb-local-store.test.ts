import { IDBFactory } from 'fake-indexeddb';

import { openIndexedDbLocalStore } from './indexeddb-local-store';

const lesson = (id: string, version = 1) => ({
  id,
  version,
  checksum: `c${String(version)}`,
  bundle: { id },
});

describe('IndexedDB local store (web app)', () => {
  it('keeps lessons in installation order, settings and progress across openings', async () => {
    const factory = new IDBFactory();
    const store = openIndexedDbLocalStore(factory);

    await store.saveLessons([lesson('b'), lesson('a')]);
    await store.seedLessons([lesson('a', 9), lesson('c')]);
    await store.saveLessons([lesson('b', 2)]);
    await store.removeLessons(['c', 'unknown']);
    await store.writeSetting('policy', 'wifi');
    await store.saveReviews([
      { itemKey: 'k', box: 1, dueAt: 'x', correct: 1, wrong: 0, lastAnsweredAt: 'x' },
    ]);

    const reopened = openIndexedDbLocalStore(factory);
    // An updated lesson keeps its place; seeding leaves installed lessons alone.
    expect((await reopened.readLessons()).map((item) => [item.id, item.version])).toEqual([
      ['b', 2],
      ['a', 1],
    ]);
    expect(await reopened.readVersions()).toEqual([
      { id: 'b', version: 2, checksum: 'c2' },
      { id: 'a', version: 1, checksum: 'c1' },
    ]);
    expect(await reopened.readSetting('policy')).toBe('wifi');
    expect(await reopened.readSetting('missing')).toBeNull();
    expect(await reopened.readReviews()).toEqual([
      { itemKey: 'k', box: 1, dueAt: 'x', correct: 1, wrong: 0, lastAnsweredAt: 'x' },
    ]);
  });
});
