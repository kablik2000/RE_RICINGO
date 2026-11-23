import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { AppError } from '@/core/errors';

import type { InstalledVersion, LocalStore, StoredLesson } from './local-store';

const DATABASE_NAME = 'rici.db';

/**
 * Schema migrations, applied in order; `PRAGMA user_version` records how many ran. Never edit a
 * migration that has shipped — append a new one.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE lessons (
     id TEXT PRIMARY KEY NOT NULL,
     version INTEGER NOT NULL,
     checksum TEXT,
     bundle TEXT NOT NULL,
     installed_at TEXT NOT NULL
   );
   CREATE TABLE settings (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

async function migrate(database: SQLiteDatabase): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let applied = row?.user_version ?? 0; applied < MIGRATIONS.length; applied += 1) {
    const migration = MIGRATIONS[applied] ?? '';
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration);
      await database.execAsync(`PRAGMA user_version = ${applied + 1}`);
    });
  }
}

async function open(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync(DATABASE_NAME);
  await database.execAsync('PRAGMA journal_mode = WAL');
  await migrate(database);
  return database;
}

interface LessonRow {
  id: string;
  version: number;
  checksum: string | null;
  bundle: string;
}

const UPSERT = `INSERT INTO lessons (id, version, checksum, bundle, installed_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET version = excluded.version, checksum = excluded.checksum,
    bundle = excluded.bundle, installed_at = excluded.installed_at`;
const INSERT_IF_MISSING = `INSERT INTO lessons (id, version, checksum, bundle, installed_at)
  VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`;

/** Offline storage in an SQLite database in the app's private files (iOS, Android). */
export function openSqliteLocalStore(): LocalStore {
  let opening: Promise<SQLiteDatabase> | null = null;
  const database = () => {
    opening ??= open().catch((error: unknown) => {
      opening = null; // try again next time instead of failing forever
      throw error;
    });
    return opening;
  };

  async function run<T>(action: string, task: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
    try {
      return await task(await database());
    } catch (error) {
      throw new AppError('unexpected', `Local storage could not ${action}.`, { cause: error });
    }
  }

  async function write(db: SQLiteDatabase, statement: string, lessons: readonly StoredLesson[]) {
    const installedAt = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      for (const lesson of lessons) {
        await db.runAsync(
          statement,
          lesson.id,
          lesson.version,
          lesson.checksum,
          JSON.stringify(lesson.bundle),
          installedAt,
        );
      }
    });
  }

  return {
    readLessons: () =>
      run('read lessons', async (db) => {
        const rows = await db.getAllAsync<LessonRow>(
          'SELECT id, version, checksum, bundle FROM lessons ORDER BY rowid',
        );
        return rows.map((row): StoredLesson => ({ ...row, bundle: JSON.parse(row.bundle) }));
      }),
    readVersions: () =>
      run('read lesson versions', (db) =>
        db.getAllAsync<InstalledVersion>('SELECT id, version, checksum FROM lessons'),
      ),
    saveLessons: (lessons) => run('save lessons', (db) => write(db, UPSERT, lessons)),
    seedLessons: (lessons) => run('seed lessons', (db) => write(db, INSERT_IF_MISSING, lessons)),
    readSetting: (key) =>
      run('read a setting', async (db) => {
        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = ?',
          key,
        );
        return row?.value ?? null;
      }),
    writeSetting: (key, value) =>
      run('save a setting', async (db) => {
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
          key,
          value,
        );
      }),
  };
}
