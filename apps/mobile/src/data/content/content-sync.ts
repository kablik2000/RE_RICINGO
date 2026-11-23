import { AppError, toAppError } from '@/core/errors';
import type { Telemetry } from '@/core/telemetry';

import { parseLessonBundle, type LessonLibrary } from '../lesson-library';
import type { StoredLesson } from '../local/local-store';
import type { ContentApi } from './content-api';
import type { LessonHolds } from './lesson-holds';
import {
  decideUpdateAction,
  findLessonUpdates,
  updateKey,
  type ConnectionKind,
  type LessonUpdate,
  type UpdatePolicy,
} from './update-rules';

export interface ContentSyncState {
  phase: 'idle' | 'checking' | 'downloading';
  /** Updates waiting for the student's confirmation (mobile data, or the "ask" policy). */
  offered: readonly LessonUpdate[];
  /** When the server was last asked successfully (ms since epoch). */
  lastCheckedAt: number | null;
  /** The last check or download the student started themselves failed with this. */
  error: AppError | null;
}

export interface CheckOptions {
  /** Started by the student: failures are shown and dismissed offers are offered again. */
  manual?: boolean;
}

/** Methods are plain functions (no `this`), safe to pass around as callbacks. */
export interface ContentSync {
  getState: () => ContentSyncState;
  subscribe: (listener: () => void) => () => void;
  /** Asks the server for new or changed lessons and downloads or offers them per the policy. */
  check: (options?: CheckOptions) => Promise<void>;
  /** Downloads the offered updates (the student confirmed). */
  downloadOffered: () => Promise<void>;
  /** Hides the current offer until the server has something else. */
  dismissOffer: () => void;
}

export interface ContentSyncDeps {
  api: ContentApi;
  library: LessonLibrary;
  holds: LessonHolds;
  getConnection(): Promise<ConnectionKind>;
  getPolicy(): Promise<UpdatePolicy>;
  telemetry: Telemetry;
  now?: () => number;
}

const INITIAL_STATE: ContentSyncState = {
  phase: 'idle',
  offered: [],
  lastCheckedAt: null,
  error: null,
};

/**
 * Keeps the offline lessons up to date (Q-18): checks the server's catalog, downloads updates
 * automatically or offers them, and installs each lesson only while it is not open.
 */
export function createContentSync(deps: ContentSyncDeps): ContentSync {
  const { api, library, holds, telemetry } = deps;
  const now = deps.now ?? Date.now;
  let state = INITIAL_STATE;
  const listeners = new Set<() => void>();
  const dismissed = new Set<string>();
  /** Downloaded while the lesson was open; installed when it closes. */
  const staged = new Map<string, StoredLesson>();

  function update(patch: Partial<ContentSyncState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => {
      listener();
    });
  }

  async function installNow(lessons: readonly StoredLesson[]) {
    const ready = lessons.filter((lesson) => !holds.isHeld(lesson.id));
    lessons
      .filter((lesson) => holds.isHeld(lesson.id))
      .forEach((lesson) => staged.set(lesson.id, lesson));
    await library.install(ready);
  }

  holds.onReleased((lessonId) => {
    const lesson = staged.get(lessonId);
    if (lesson === undefined) {
      return;
    }
    staged.delete(lessonId);
    library.install([lesson]).catch((error: unknown) => {
      telemetry.captureError(toAppError(error), { lessonId, step: 'install-staged' });
    });
  });

  /** Downloads and validates each update; installs those that arrived intact. */
  async function download(updates: readonly LessonUpdate[]) {
    if (updates.length === 0) {
      return;
    }
    update({ phase: 'downloading' });
    const downloaded: StoredLesson[] = [];
    let firstError: AppError | null = null;
    for (const { lesson } of updates) {
      try {
        const { checksum, bundle } = await api.fetchLessonVersion(lesson.id, lesson.version);
        const parsed = parseLessonBundle(bundle, `"${lesson.id}" v${lesson.version}`);
        if (parsed.lesson.id !== lesson.id) {
          throw new AppError(
            'validation',
            `Downloaded lesson is "${parsed.lesson.id}", expected "${lesson.id}".`,
          );
        }
        downloaded.push({ id: lesson.id, version: lesson.version, checksum, bundle });
      } catch (error) {
        const appError = toAppError(error);
        telemetry.captureError(appError, { lessonId: lesson.id, step: 'download' });
        firstError ??= appError;
      }
    }
    await installNow(downloaded);
    const done = new Set(downloaded.map((lesson) => lesson.id));
    update({ offered: state.offered.filter((offer) => !done.has(offer.lesson.id)) });
    if (firstError !== null) {
      throw firstError;
    }
  }

  async function run(manual: boolean, task: () => Promise<void>) {
    if (state.phase !== 'idle') {
      return;
    }
    if (manual) {
      update({ error: null });
    }
    try {
      await task();
    } catch (error) {
      const appError = toAppError(error);
      if (manual) {
        update({ error: appError });
      } else {
        telemetry.captureError(appError, { step: 'background-update' });
      }
    } finally {
      update({ phase: 'idle' });
    }
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    check({ manual = false } = {}) {
      return run(manual, async () => {
        update({ phase: 'checking' });
        const connection = await deps.getConnection();
        if (connection === 'offline') {
          if (manual) {
            throw new AppError('network', 'The device is offline.');
          }
          return;
        }
        const [catalog, installed, policy] = await Promise.all([
          api.fetchCatalog(),
          library.installedVersions(),
          deps.getPolicy(),
        ]);
        const pending = findLessonUpdates(installed, catalog).filter(
          (candidate) => staged.get(candidate.lesson.id)?.checksum !== candidate.lesson.checksum,
        );
        update({ lastCheckedAt: now() });
        if (manual) {
          dismissed.clear();
        }
        const action = decideUpdateAction(policy, connection);
        if (action === 'download') {
          await download(pending);
        } else if (action === 'offer') {
          update({ offered: pending.filter((candidate) => !dismissed.has(updateKey(candidate))) });
        }
      });
    },

    downloadOffered() {
      return run(true, () => download(state.offered));
    },

    dismissOffer() {
      state.offered.forEach((offer) => dismissed.add(updateKey(offer)));
      update({ offered: [] });
    },
  };
}
