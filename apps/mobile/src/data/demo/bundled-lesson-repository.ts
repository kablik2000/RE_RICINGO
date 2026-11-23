import {
  countExchanges,
  findLexemeOccurrences,
  listSentencesInOrder,
  validateLessonBundle,
  type LessonBundle,
} from '@ricingo/domain';

import { AppError } from '@/core/errors';

import type { LessonRepository, LessonSummary, VocabularyEntry } from '../lesson-repository';

const ITALIAN_COLLATOR = new Intl.Collator('it');

function loadBundles(rawBundles: readonly unknown[]): readonly LessonBundle[] {
  return rawBundles.map((raw, index) => {
    const result = validateLessonBundle(raw);
    if (!result.ok) {
      const details = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
      throw new AppError('validation', `Bundled lesson #${index} is invalid: ${details}`);
    }
    return result.bundle;
  });
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

/**
 * Serves lessons bundled with the app. DEMO ONLY until the backend exists (M2): content is
 * validated with the same domain rules the content pipeline will use.
 */
export function createBundledLessonRepository(rawBundles: readonly unknown[]): LessonRepository {
  let cache: readonly LessonBundle[] | null = null;
  const bundles = (): readonly LessonBundle[] => {
    cache ??= loadBundles(rawBundles);
    return cache;
  };

  return {
    listLessons() {
      return Promise.resolve().then(() => bundles().map(toSummary));
    },

    getLessonBundle(lessonId) {
      return Promise.resolve().then(() => {
        const bundle = bundles().find((candidate) => candidate.lesson.id === lessonId);
        if (bundle === undefined) {
          throw new AppError('notFound', `Lesson "${lessonId}" does not exist.`);
        }
        return bundle;
      });
    },

    listVocabulary() {
      return Promise.resolve().then(() =>
        bundles()
          .flatMap((bundle) =>
            findLexemeOccurrences(bundle).map((occurrence): VocabularyEntry => ({
              lexeme: occurrence.lexeme,
              lessonId: bundle.lesson.id,
              lessonTitle: bundle.lesson.titleItalian,
              sentences: occurrence.sentences,
            })),
          )
          .sort((a, b) => ITALIAN_COLLATOR.compare(a.lexeme.lemma, b.lexeme.lemma)),
      );
    },
  };
}
