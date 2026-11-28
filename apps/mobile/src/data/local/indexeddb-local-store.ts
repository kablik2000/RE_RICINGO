import type { ReviewState } from '@ricingo/domain';

import { AppError } from '@/core/errors';

import type { InstalledVersion, LocalStore, StoredLesson } from './local-store';

const DATABASE_NAME = 'rici';
/** Bump with a new branch in `upgrade` when stores change; never change a shipped branch. */
const DATABASE_VERSION = 1;

type StoreName = 'lessons' | 'settings' | 'reviews';

interface LessonRecord extends StoredLesson {
  installedAt: string;
}

function upgrade(database: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    database.createObjectStore('lessons', { keyPath: 'id' });
    database.createObjectStore('settings');
    database.createObjectStore('reviews', { keyPath: 'itemKey' });
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
  });
}

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DATABASE_NAME, DATABASE_VERSION);
    req.onupgradeneeded = (event) => {
      upgrade(req.result, event.oldVersion);
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB could not be opened'));
    };
    req.onblocked = () => {
      reject(new Error('IndexedDB is blocked by another tab with an older version'));
    };
  });
}

/**
 * Offline storage of the web app (ADR-0019) in the browser's IndexedDB: installed lessons,
 * settings and practice progress, like SQLite on iOS/Android. Every method rejects with an
 * `AppError`.
 */
export function openIndexedDbLocalStore(factory: IDBFactory): LocalStore {
  let opening: Promise<IDBDatabase> | null = null;
  const database = () => {
    opening ??= open(factory).catch((error: unknown) => {
      opening = null; // try again next time instead of failing forever
      throw error;
    });
    return opening;
  };

  async function run<T>(
    action: string,
    stores: StoreName[],
    mode: IDBTransactionMode,
    task: (transaction: IDBTransaction) => Promise<T> | T,
  ): Promise<T> {
    try {
      const transaction = (await database()).transaction(stores, mode);
      const finished = done(transaction);
      // Reported through the task's own error when the task fails first.
      finished.catch(() => undefined);
      const result = await task(transaction);
      await finished;
      return result;
    } catch (error) {
      throw new AppError('unexpected', `Local storage could not ${action}.`, { cause: error });
    }
  }

  async function allLessons(transaction: IDBTransaction): Promise<LessonRecord[]> {
    const records = (await request(transaction.objectStore('lessons').getAll())) as LessonRecord[];
    // Installation order, like `ORDER BY rowid` in SQLite.
    return records.sort((a, b) => a.installedAt.localeCompare(b.installedAt));
  }

  /** Inserts or replaces lessons; a replaced lesson keeps its place (like an SQLite upsert). */
  async function put(transaction: IDBTransaction, lessons: readonly StoredLesson[]) {
    const store = transaction.objectStore('lessons');
    const installedAt = new Date().toISOString();
    for (const [index, lesson] of lessons.entries()) {
      const existing = (await request(store.get(lesson.id))) as LessonRecord | undefined;
      store.put({
        ...lesson,
        // The batch index keeps the batch's order when several lessons share a timestamp.
        installedAt: existing?.installedAt ?? `${installedAt}#${String(index).padStart(4, '0')}`,
      });
    }
  }

  return {
    readLessons: () =>
      run('read lessons', ['lessons'], 'readonly', async (transaction) =>
        (await allLessons(transaction)).map(({ id, version, checksum, bundle }): StoredLesson => ({
          id,
          version,
          checksum,
          bundle,
        })),
      ),
    readVersions: () =>
      run('read lesson versions', ['lessons'], 'readonly', async (transaction) =>
        (await allLessons(transaction)).map(({ id, version, checksum }): InstalledVersion => ({
          id,
          version,
          checksum,
        })),
      ),
    saveLessons: (lessons) =>
      run('save lessons', ['lessons'], 'readwrite', (transaction) => put(transaction, lessons)),
    seedLessons: (lessons) =>
      run('seed lessons', ['lessons'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('lessons');
        const missing: StoredLesson[] = [];
        for (const lesson of lessons) {
          if ((await request(store.getKey(lesson.id))) === undefined) missing.push(lesson);
        }
        await put(transaction, missing);
      }),
    removeLessons: (lessonIds) =>
      run('remove lessons', ['lessons'], 'readwrite', (transaction) => {
        const store = transaction.objectStore('lessons');
        lessonIds.forEach((id) => store.delete(id));
      }),
    readSetting: (key) =>
      run('read a setting', ['settings'], 'readonly', async (transaction) => {
        const value: unknown = await request(transaction.objectStore('settings').get(key));
        return typeof value === 'string' ? value : null;
      }),
    writeSetting: (key, value) =>
      run('save a setting', ['settings'], 'readwrite', (transaction) => {
        transaction.objectStore('settings').put(value, key);
      }),
    readReviews: () =>
      run(
        'read practice progress',
        ['reviews'],
        'readonly',
        async (transaction) =>
          (await request(transaction.objectStore('reviews').getAll())) as ReviewState[],
      ),
    saveReviews: (reviews) =>
      run('save practice progress', ['reviews'], 'readwrite', (transaction) => {
        const store = transaction.objectStore('reviews');
        reviews.forEach((state) => store.put(state));
      }),
  };
}
