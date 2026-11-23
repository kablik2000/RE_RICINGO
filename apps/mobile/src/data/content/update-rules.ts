import type { InstalledVersion } from '../local/local-store';
import type { CatalogEntry } from './content-api';

/**
 * When lesson updates download (Q-18, owner decision 2026-11-23), chosen by the student in
 * Profile → Aktualizace lekcí:
 * - `wifi`   — automatically on Wi-Fi, offered on mobile data (default)
 * - `always` — always automatically
 * - `ask`    — always offered, never automatic
 */
export const UPDATE_POLICIES = ['wifi', 'always', 'ask'] as const;
export type UpdatePolicy = (typeof UPDATE_POLICIES)[number];
export const DEFAULT_UPDATE_POLICY: UpdatePolicy = 'wifi';

export function isUpdatePolicy(value: unknown): value is UpdatePolicy {
  return UPDATE_POLICIES.some((policy) => policy === value);
}

/** The connection as far as downloading is concerned. */
export type ConnectionKind = 'offline' | 'unmetered' | 'metered';

/** Shape of `expo-network`'s state (kept structural so this module stays pure). */
export interface NetworkStateLike {
  type?: string;
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

const UNMETERED_TYPES = new Set(['WIFI', 'ETHERNET']);

/** Unknown connection types count as metered: better to ask than to spend the student's data. */
export function toConnectionKind(state: NetworkStateLike): ConnectionKind {
  if (state.isConnected === false || state.isInternetReachable === false || state.type === 'NONE') {
    return 'offline';
  }
  return state.type !== undefined && UNMETERED_TYPES.has(state.type) ? 'unmetered' : 'metered';
}

export type UpdateAction = 'download' | 'offer' | 'none';

export function decideUpdateAction(policy: UpdatePolicy, connection: ConnectionKind): UpdateAction {
  if (connection === 'offline') {
    return 'none';
  }
  if (policy === 'always') {
    return 'download';
  }
  if (policy === 'ask') {
    return 'offer';
  }
  return connection === 'unmetered' ? 'download' : 'offer';
}

export interface LessonUpdate {
  kind: 'new' | 'changed';
  lesson: CatalogEntry;
}

/**
 * Lessons whose published version differs from the installed one. The server is the source of
 * truth, so a different version number counts too (e.g. a reset development database). Bundled
 * lessons (no checksum) of the same version are the same content and need no download.
 */
export function findLessonUpdates(
  installed: readonly InstalledVersion[],
  catalog: readonly CatalogEntry[],
): LessonUpdate[] {
  const byId = new Map(installed.map((lesson) => [lesson.id, lesson]));
  return catalog.flatMap((lesson): LessonUpdate[] => {
    const current = byId.get(lesson.id);
    if (current === undefined) {
      return [{ kind: 'new', lesson }];
    }
    const differs =
      current.version !== lesson.version ||
      (current.checksum !== null && current.checksum !== lesson.checksum);
    return differs ? [{ kind: 'changed', lesson }] : [];
  });
}

/**
 * Installed lessons the server no longer publishes (the lecturer unpublished or archived them).
 * The catalog is the source of truth, so this includes lessons bundled with the app.
 */
export function findWithdrawnLessons(
  installed: readonly InstalledVersion[],
  catalog: readonly CatalogEntry[],
): string[] {
  const published = new Set(catalog.map((lesson) => lesson.id));
  return installed.filter((lesson) => !published.has(lesson.id)).map((lesson) => lesson.id);
}

/** Identifies one offered version, so a dismissed offer is not repeated for the same content. */
export function updateKey(update: LessonUpdate): string {
  return `${update.lesson.id}@${update.lesson.checksum}`;
}
