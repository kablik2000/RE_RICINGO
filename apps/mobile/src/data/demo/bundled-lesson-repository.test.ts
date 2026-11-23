import { validateLessonBundle } from '@ricingo/domain';

import { AppError } from '@/core/errors';

import alBar from './al-bar.lesson.json';
import { createBundledLessonRepository } from './bundled-lesson-repository';

describe('demo content', () => {
  it('"Al bar" passes schema and reference validation', () => {
    const result = validateLessonBundle(alBar);

    expect(result.ok ? [] : result.issues).toEqual([]);
  });
});

describe('createBundledLessonRepository', () => {
  const repository = createBundledLessonRepository([alBar]);

  it('lists lesson summaries', async () => {
    const lessons = await repository.listLessons();

    expect(lessons).toEqual([
      expect.objectContaining({
        id: 'al-bar',
        titleItalian: 'Al bar',
        level: 'A1',
        exchangeCount: 4,
        sentenceCount: 12,
      }),
    ]);
  });

  it('returns a lesson bundle by id', async () => {
    const bundle = await repository.getLessonBundle('al-bar');

    expect(bundle.lesson.turns).toHaveLength(7);
  });

  it('rejects unknown lessons with a notFound AppError', async () => {
    await expect(repository.getLessonBundle('in-stazione')).rejects.toMatchObject({
      kind: 'notFound',
    });
  });

  it('lists vocabulary alphabetically with the sentences where each word occurs', async () => {
    const vocabulary = await repository.listVocabulary();
    const lemmas = vocabulary.map((entry) => entry.lexeme.lemma);

    expect(lemmas).toEqual([...lemmas].sort((a, b) => a.localeCompare(b, 'it')));
    const volere = vocabulary.find((entry) => entry.lexeme.id === 'volere');
    expect(volere?.sentences.map((sentence) => sentence.italian)).toEqual([
      'Vorrei un cappuccino e una pizza.',
    ]);
  });

  it('rejects invalid bundled content with a validation AppError', async () => {
    const broken = createBundledLessonRepository([{ contentSchemaVersion: 1 }]);

    const error: unknown = await broken.listLessons().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'validation' });
  });
});
