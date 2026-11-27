import {
  countExchanges,
  findLexemeOccurrences,
  listSentencesInOrder,
  validateLessonBundle,
  type LessonBundle,
} from '@ricingo/domain';

import { AppError, toAppError } from '@/core/errors';
import { telemetry } from '@/core/telemetry';

import type { LessonRepository, LessonSummary, VocabularyEntry } from './lesson-repository';
import type { InstalledVersion, LocalStore, StoredLesson } from './local/local-store';

const ITALIAN_COLLATOR = new Intl.Collator('it');

/** Validates a lesson bundle; an invalid one becomes a `validation` AppError. */
export function parseLessonBundle(raw: unknown, source: string): LessonBundle {
  const result = validateLessonBundle(raw);
  if (!result.ok) {
    const details = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    throw new AppError('validation', `Lesson ${source} is invalid: ${details}`);
  }
  return result.bundle;
}

/** A bundled lesson as stored on the device before anything was downloaded. */
export function toSeed(raw: unknown, index: number): StoredLesson {
  const bundle = parseLessonBundle(raw, `bundled #${index}`);
  return { id: bundle.lesson.id, version: bundle.lesson.version, checksum: null, bundle: raw };
}

function toSummary(bundle: LessonBundle): LessonSummary {
  const { lesson } = bundle;
  return {
    id: lesson.id,
    titleItalian: lesson.titleItalian,
    titleCzech: lesson.titleCzech,
    level: lesson.level,
    goal: lesson.goal,
    exchangeCount: countExchanges(lesson),
    sentenceCount: listSentencesInOrder(lesson).length,
  };
}

export type InstalledListener = (lessonIds: readonly string[]) => void;

/** The lessons installed on the device: what screens read and what updates replace. */
export interface LessonLibrary extends LessonRepository {
  /** Every installed lesson's content (practice is generated from all of them). */
  listBundles(): Promise<readonly LessonBundle[]>;
  installedVersions(): Promise<readonly InstalledVersion[]>;
  /** Installs downloaded lessons (already validated) and tells listeners which ones changed. */
  install(lessons: readonly StoredLesson[]): Promise<void>;
  /** Deletes lessons the server no longer publishes and tells listeners which ones changed. */
  remove(lessonIds: readonly string[]): Promise<void>;
  /** Called with the IDs of lessons that were installed, replaced or removed. */
  onInstalled(listener: InstalledListener): () => void;
}

/** Set once the bundled lessons were stored, so a lesson the server withdrew stays removed. */
const SEEDED_SETTING = 'lessons.seeded';

/**
 * Lessons from the device's offline store. On first use the store is seeded with the lessons
 * bundled with the app, so the app works offline from the first start (Q-18).
 */
export function createLessonLibrary(
  store: LocalStore,
  seeds: () => readonly StoredLesson[],
): LessonLibrary {
  let seeding: Promise<void> | null = null;
  const ready = () => {
    seeding ??= store
      .readSetting(SEEDED_SETTING)
      .then(async (seeded) => {
        if (seeded === null) {
          await store.seedLessons(seeds());
          await store.writeSetting(SEEDED_SETTING, '1');
        }
      })
      .catch((error: unknown) => {
        seeding = null;
        throw error;
      });
    return seeding;
  };

  let loading: Promise<readonly LessonBundle[]> | null = null;
  const bundles = () => {
    loading ??= ready()
      .then(() => store.readLessons())
      .then((stored) =>
        stored.flatMap((lesson) => {
          try {
            return [parseLessonBundle(lesson.bundle, `"${lesson.id}" v${lesson.version}`)];
          } catch (error) {
            // Stored before an app update changed the schema: skip it; the next update check
            // downloads a version this app understands.
            telemetry.captureError(toAppError(error), { lessonId: lesson.id });
            return [];
          }
        }),
      )
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
    return loading;
  };

  const listeners = new Set<InstalledListener>();
  const changed = (lessonIds: readonly string[]) => {
    loading = null;
    listeners.forEach((listener) => {
      listener(lessonIds);
    });
  };

  return {
    listLessons: async () => (await bundles()).map(toSummary),
    listBundles: () => bundles(),

    async getLessonBundle(lessonId) {
      const bundle = (await bundles()).find((candidate) => candidate.lesson.id === lessonId);
      if (bundle === undefined) {
        throw new AppError('notFound', `Lesson "${lessonId}" does not exist.`);
      }
      return bundle;
    },

    async listVocabulary() {
      return (await bundles())
        .flatMap((bundle) =>
          findLexemeOccurrences(bundle).map((occurrence): VocabularyEntry => ({
            lexeme: occurrence.lexeme,
            lessonId: bundle.lesson.id,
            lessonTitle: bundle.lesson.titleItalian,
            sentences: occurrence.sentences,
          })),
        )
        .sort((a, b) => ITALIAN_COLLATOR.compare(a.lexeme.lemma, b.lexeme.lemma));
    },

    async installedVersions() {
      await ready();
      return store.readVersions();
    },

    async install(lessons) {
      if (lessons.length === 0) {
        return;
      }
      await ready();
      await store.saveLessons(lessons);
      changed(lessons.map((lesson) => lesson.id));
    },

    async remove(lessonIds) {
      if (lessonIds.length === 0) {
        return;
      }
      await ready();
      await store.removeLessons(lessonIds);
      changed(lessonIds);
    },

    onInstalled(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
