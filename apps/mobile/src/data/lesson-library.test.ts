import { validateLessonBundle } from '@ricingo/domain';

import { AppError } from '@/core/errors';
import { lessonBundle } from '@/testing/fake-content-server';

import alBar from './demo/al-bar.lesson.json';
import { createLessonLibrary, toSeed } from './lesson-library';
import { createMemoryLocalStore } from './local/local-store';

describe('demo content', () => {
  it('"Al bar" passes schema and reference validation', () => {
    const result = validateLessonBundle(alBar);

    expect(result.ok ? [] : result.issues).toEqual([]);
  });
});

describe('lesson library', () => {
  const library = createLessonLibrary(createMemoryLocalStore(), () => [toSeed(alBar, 0)]);

  it('starts with the lessons bundled with the app', async () => {
    const lessons = await library.listLessons();

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
    const bundle = await library.getLessonBundle('al-bar');

    expect(bundle.lesson.turns).toHaveLength(7);
  });

  it('rejects unknown lessons with a notFound AppError', async () => {
    await expect(library.getLessonBundle('in-stazione')).rejects.toMatchObject({
      kind: 'notFound',
    });
  });

  it('lists vocabulary alphabetically with the sentences where each word occurs', async () => {
    const vocabulary = await library.listVocabulary();
    const lemmas = vocabulary.map((entry) => entry.lexeme.lemma);

    expect(lemmas).toEqual([...lemmas].sort((a, b) => a.localeCompare(b, 'it')));
    const volere = vocabulary.find((entry) => entry.lexeme.id === 'volere');
    expect(volere?.sentences.map((sentence) => sentence.italian)).toEqual([
      'Vorrei un cappuccino e una pizza.',
    ]);
  });

  it('rejects invalid bundled content with a validation AppError', async () => {
    const broken = createLessonLibrary(createMemoryLocalStore(), () => [
      toSeed({ contentSchemaVersion: 1 }, 0),
    ]);

    const error: unknown = await broken.listLessons().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'validation' });
  });

  it('does not bring back a bundled lesson that was removed', async () => {
    const store = createMemoryLocalStore();
    const library = createLessonLibrary(store, () => [toSeed(alBar, 0)]);
    await library.remove(['al-bar']);

    const afterRestart = createLessonLibrary(store, () => [toSeed(alBar, 0)]);

    expect(await afterRestart.listLessons()).toEqual([]);
  });

  it('serves installed updates and never lets the bundled seed overwrite them', async () => {
    const store = createMemoryLocalStore();
    await store.saveLessons([
      { id: 'al-bar', version: 2, checksum: 'v2', bundle: lessonBundle('al-bar', 2, 'Al bar 2') },
    ]);
    const updated = createLessonLibrary(store, () => [toSeed(alBar, 0)]);

    expect((await updated.listLessons())[0]?.titleItalian).toBe('Al bar 2');
    expect(await updated.installedVersions()).toEqual([
      { id: 'al-bar', version: 2, checksum: 'v2' },
    ]);
  });
});
