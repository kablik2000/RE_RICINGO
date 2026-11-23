/**
 * A lesson version kept on the device. `checksum` identifies the published version it came from;
 * it is `null` for lessons bundled with the app (they were never downloaded).
 */
export interface StoredLesson {
  id: string;
  version: number;
  checksum: string | null;
  /** Parsed lesson bundle JSON, validated by the caller before it is used. */
  bundle: unknown;
}

/** Which version of a lesson is installed, without its content. */
export type InstalledVersion = Pick<StoredLesson, 'id' | 'version' | 'checksum'>;

/**
 * The device's offline storage: installed lessons and small settings. SQLite on iOS/Android,
 * memory in web previews and tests. Every method rejects with an `AppError`.
 */
export interface LocalStore {
  /** All installed lessons, in the order they were first installed. */
  readLessons(): Promise<readonly StoredLesson[]>;
  readVersions(): Promise<readonly InstalledVersion[]>;
  /** Inserts or replaces lessons, all or nothing. */
  saveLessons(lessons: readonly StoredLesson[]): Promise<void>;
  /** Inserts lessons that are not installed yet; installed ones are left alone. */
  seedLessons(lessons: readonly StoredLesson[]): Promise<void>;
  /** Deletes the lessons with these IDs (unknown IDs are ignored). */
  removeLessons(lessonIds: readonly string[]): Promise<void>;
  readSetting(key: string): Promise<string | null>;
  writeSetting(key: string, value: string): Promise<void>;
}

/** Storage that lives as long as the JavaScript runtime (web previews, tests). */
export function createMemoryLocalStore(): LocalStore {
  const lessons = new Map<string, StoredLesson>();
  const settings = new Map<string, string>();
  return {
    readLessons: () => Promise.resolve([...lessons.values()]),
    readVersions: () =>
      Promise.resolve(
        [...lessons.values()].map(({ id, version, checksum }) => ({ id, version, checksum })),
      ),
    saveLessons(saved) {
      for (const lesson of saved) {
        lessons.set(lesson.id, lesson);
      }
      return Promise.resolve();
    },
    seedLessons(seeds) {
      for (const lesson of seeds) {
        if (!lessons.has(lesson.id)) {
          lessons.set(lesson.id, lesson);
        }
      }
      return Promise.resolve();
    },
    removeLessons(lessonIds) {
      for (const id of lessonIds) {
        lessons.delete(id);
      }
      return Promise.resolve();
    },
    readSetting: (key) => Promise.resolve(settings.get(key) ?? null),
    writeSetting(key, value) {
      settings.set(key, value);
      return Promise.resolve();
    },
  };
}
