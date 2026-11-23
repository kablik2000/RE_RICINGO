import type { CatalogEntry } from './content-api';
import { decideUpdateAction, findLessonUpdates, toConnectionKind } from './update-rules';

function entry(id: string, version: number, checksum: string): CatalogEntry {
  return {
    id,
    version,
    checksum,
    publishedAt: '2026-11-23T10:00:00+00:00',
    titleItalian: id,
    titleCzech: id,
    level: 'A1',
  };
}

describe('decideUpdateAction (owner decision Q-18)', () => {
  it('downloads on Wi-Fi and offers on mobile data by default', () => {
    expect(decideUpdateAction('wifi', 'unmetered')).toBe('download');
    expect(decideUpdateAction('wifi', 'metered')).toBe('offer');
  });

  it('follows "always" and "ask" on any connection', () => {
    expect(decideUpdateAction('always', 'metered')).toBe('download');
    expect(decideUpdateAction('ask', 'unmetered')).toBe('offer');
  });

  it('does nothing offline', () => {
    expect(decideUpdateAction('always', 'offline')).toBe('none');
  });
});

describe('toConnectionKind', () => {
  it('treats Wi-Fi and Ethernet as unmetered and anything else as metered', () => {
    expect(toConnectionKind({ type: 'WIFI', isConnected: true })).toBe('unmetered');
    expect(toConnectionKind({ type: 'ETHERNET', isConnected: true })).toBe('unmetered');
    expect(toConnectionKind({ type: 'CELLULAR', isConnected: true })).toBe('metered');
    expect(toConnectionKind({ type: 'UNKNOWN', isConnected: true })).toBe('metered');
  });

  it('recognises an offline device', () => {
    expect(toConnectionKind({ type: 'WIFI', isConnected: false })).toBe('offline');
    expect(toConnectionKind({ type: 'WIFI', isConnected: true, isInternetReachable: false })).toBe(
      'offline',
    );
    expect(toConnectionKind({ type: 'NONE' })).toBe('offline');
  });
});

describe('findLessonUpdates', () => {
  it('finds new lessons and lessons with another published version', () => {
    const updates = findLessonUpdates(
      [
        { id: 'al-bar', version: 1, checksum: 'a1' },
        { id: 'in-albergo', version: 2, checksum: 'b2' },
      ],
      [entry('al-bar', 2, 'a2'), entry('in-albergo', 2, 'b2'), entry('alla-stazione', 1, 'c1')],
    );

    expect(updates.map((update) => [update.kind, update.lesson.id])).toEqual([
      ['changed', 'al-bar'],
      ['new', 'alla-stazione'],
    ]);
  });

  it('treats a bundled lesson of the same version as up to date', () => {
    expect(
      findLessonUpdates([{ id: 'al-bar', version: 1, checksum: null }], [entry('al-bar', 1, 'a1')]),
    ).toEqual([]);
  });

  it('follows the server when its version is lower (a reset development database)', () => {
    expect(
      findLessonUpdates([{ id: 'al-bar', version: 3, checksum: 'a3' }], [entry('al-bar', 1, 'a1')]),
    ).toHaveLength(1);
  });
});
