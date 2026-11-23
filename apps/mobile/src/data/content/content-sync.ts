import { AppError, toAppError } from '@/core/errors';
import type { Telemetry } from '@/core/telemetry';

import { parseLessonBundle, type LessonLibrary } from '../lesson-library';
import type { StoredLesson } from '../local/local-store';
import type { ContentApi } from './content-api';
import type { LessonHolds } from './lesson-holds';
import {
  decideUpdateAction,
  findLessonUpdates,
  findWithdrawnLessons,
  updateKey,
  type ConnectionKind,
  type LessonUpdate,
  type UpdatePolicy,
} from './update-rules';

/** A lesson that was installed, replaced or removed on the device. */
export interface LessonChange {
  kind: 'added' | 'updated' | 'removed';
  lessonId: string;
  /** Italian title, to tell the student which lesson it was. */
  title: string;
}

export interface ContentSyncState {
  phase: 'idle' | 'checking' | 'downloading';
  /** Updates waiting for the student's confirmation (mobile data, or the "ask" policy). */
  offered: readonly LessonUpdate[];
  /** Changes made on the device the student has not acknowledged yet (newest last). */
  changes: readonly LessonChange[];
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
  /** The student has seen the list of changes. */
  acknowledgeChanges: () => void;
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

/** A downloaded lesson and how it changes the device's lessons. */
interface Downloaded {
  lesson: StoredLesson;
  change: LessonChange;
}

const INITIAL_STATE: ContentSyncState = {
  phase: 'idle',
  offered: [],
  changes: [],
  lastCheckedAt: null,
  error: null,
};

/**
 * Keeps the offline lessons up to date (Q-18): checks the server's catalog, downloads updates
 * automatically or offers them, removes lessons the server no longer publishes, and changes each
 * lesson only while it is not open.
 */
export function createContentSync(deps: ContentSyncDeps): ContentSync {
  const { api, library, holds, telemetry } = deps;
  const now = deps.now ?? Date.now;
  let state = INITIAL_STATE;
  const listeners = new Set<() => void>();
  const dismissed = new Set<string>();
  /** Downloaded while the lesson was open; installed when it closes. */
  const staged = new Map<string, Downloaded>();
  /** Withdrawn by the server while the lesson was open (ID → title); removed when it closes. */
  const stagedRemovals = new Map<string, string>();

  function update(patch: Partial<ContentSyncState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => {
      listener();
    });
  }

  /** Adds changes to the list the student sees; a lesson keeps only its latest change. */
  function recordChanges(changes: readonly LessonChange[]) {
    if (changes.length === 0) {
      return;
    }
    const ids = new Set(changes.map((change) => change.lessonId));
    update({
      changes: [...state.changes.filter((change) => !ids.has(change.lessonId)), ...changes],
    });
  }

  async function installNow(items: readonly Downloaded[]) {
    const ready = items.filter((item) => !holds.isHeld(item.lesson.id));
    items
      .filter((item) => holds.isHeld(item.lesson.id))
      .forEach((item) => staged.set(item.lesson.id, item));
    await library.install(ready.map((item) => item.lesson));
    recordChanges(ready.map((item) => item.change));
  }

  holds.onReleased((lessonId) => {
    const removedTitle = stagedRemovals.get(lessonId);
    if (removedTitle !== undefined) {
      stagedRemovals.delete(lessonId);
      library
        .remove([lessonId])
        .then(() => {
          recordChanges([{ kind: 'removed', lessonId, title: removedTitle }]);
        })
        .catch((error: unknown) => {
          telemetry.captureError(toAppError(error), { lessonId, step: 'remove-staged' });
        });
      return;
    }
    const item = staged.get(lessonId);
    if (item === undefined) {
      return;
    }
    staged.delete(lessonId);
    library
      .install([item.lesson])
      .then(() => {
        recordChanges([item.change]);
      })
      .catch((error: unknown) => {
        telemetry.captureError(toAppError(error), { lessonId, step: 'install-staged' });
      });
  });

  /** Downloads and validates each update; installs those that arrived intact. */
  async function download(updates: readonly LessonUpdate[]) {
    if (updates.length === 0) {
      return;
    }
    update({ phase: 'downloading' });
    const downloaded: Downloaded[] = [];
    let firstError: AppError | null = null;
    for (const { kind, lesson } of updates) {
      try {
        const { checksum, bundle } = await api.fetchLessonVersion(lesson.id, lesson.version);
        const parsed = parseLessonBundle(bundle, `"${lesson.id}" v${lesson.version}`);
        if (parsed.lesson.id !== lesson.id) {
          throw new AppError(
            'validation',
            `Downloaded lesson is "${parsed.lesson.id}", expected "${lesson.id}".`,
          );
        }
        downloaded.push({
          lesson: { id: lesson.id, version: lesson.version, checksum, bundle },
          change: {
            kind: kind === 'new' ? 'added' : 'updated',
            lessonId: lesson.id,
            title: parsed.lesson.titleItalian,
          },
        });
      } catch (error) {
        const appError = toAppError(error);
        telemetry.captureError(appError, { lessonId: lesson.id, step: 'download' });
        firstError ??= appError;
      }
    }
    await installNow(downloaded);
    const done = new Set(downloaded.map((item) => item.lesson.id));
    update({ offered: state.offered.filter((offer) => !done.has(offer.lesson.id)) });
    if (firstError !== null) {
      throw firstError;
    }
  }

  /** Removing costs no data, so it does not wait for Wi-Fi or the student's confirmation. */
  async function removeWithdrawn(lessonIds: readonly string[]) {
    stagedRemovals.clear();
    if (lessonIds.length === 0) {
      return;
    }
    const withdrawn = new Set(lessonIds);
    const titles = new Map(
      (await library.listLessons()).map((lesson) => [lesson.id, lesson.titleItalian]),
    );
    const titleOf = (id: string) => titles.get(id) ?? id;
    lessonIds.filter((id) => holds.isHeld(id)).forEach((id) => stagedRemovals.set(id, titleOf(id)));
    withdrawn.forEach((id) => staged.delete(id));
    update({ offered: state.offered.filter((offer) => !withdrawn.has(offer.lesson.id)) });
    const now = lessonIds.filter((id) => !holds.isHeld(id));
    await library.remove(now);
    recordChanges(now.map((id) => ({ kind: 'removed', lessonId: id, title: titleOf(id) })));
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
          (candidate) =>
            staged.get(candidate.lesson.id)?.lesson.checksum !== candidate.lesson.checksum,
        );
        update({ lastCheckedAt: now() });
        await removeWithdrawn(findWithdrawnLessons(installed, catalog));
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

    acknowledgeChanges() {
      update({ changes: [] });
    },
  };
}
