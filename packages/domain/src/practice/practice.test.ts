import {
  CONTENT_SCHEMA_VERSION,
  lessonBundleSchema,
  type LessonBundle,
} from '../content/lesson-bundle';

import { generateExercises, isCorrectAnswer, type Exercise } from './exercises';
import { seededRandom } from './random';
import { countPractice, isDue, planSession, practiceCandidates, review } from './review';
import {
  canCheck,
  currentAnswer,
  isSessionFinished,
  practiceSessionReducer,
  startSession,
} from './session';
import { normalizeText, sameText } from './text';

function segment(
  id: string,
  text: string,
  lexemeIds: string[] = [],
  grammarTopicIds: string[] = [],
) {
  return { id, text, explanation: { meaning: text }, lexemeIds, grammarTopicIds };
}

function createBundle(practice?: LessonBundle['practice']): LessonBundle {
  return lessonBundleSchema.parse({
    contentSchemaVersion: CONTENT_SCHEMA_VERSION,
    lesson: {
      id: 'al-bar',
      version: 1,
      level: 'A1',
      titleItalian: 'Al bar',
      titleCzech: 'V kavárně',
      goal: 'Objednat si kávu.',
      speakers: [
        { id: 'barista', label: 'Barista' },
        { id: 'customer', label: 'Zákazník' },
      ],
      turns: [
        {
          id: 'turn-1',
          speakerId: 'barista',
          sentences: [
            {
              id: 'buongiorno',
              italian: 'Buongiorno!',
              czech: 'Dobrý den!',
              segments: [segment('buongiorno-1', 'Buongiorno', ['buongiorno'], ['greetings'])],
            },
            {
              id: 'cosa-desidera',
              italian: 'Cosa desidera?',
              czech: 'Co si přejete?',
              segments: [
                segment('cosa', 'Cosa', ['cosa']),
                segment('desidera', 'desidera', ['desiderare'], ['formal-lei']),
              ],
            },
          ],
        },
        {
          id: 'turn-2',
          speakerId: 'customer',
          sentences: [
            {
              id: 'vorrei',
              italian: 'Vorrei un cappuccino e una pizza.',
              czech: 'Dal bych si cappuccino a pizzu.',
              segments: [
                segment('vorrei-1', 'Vorrei', ['volere'], ['conditional']),
                segment('un-cappuccino', 'un cappuccino', ['cappuccino'], ['article']),
                segment('e', 'e', ['e']),
                segment('una-pizza', 'una pizza', ['pizza'], ['article']),
              ],
            },
          ],
        },
        {
          id: 'turn-3',
          speakerId: 'barista',
          sentences: [
            {
              id: 'al-banco',
              italian: 'Al banco o al tavolo?',
              czech: 'U baru, nebo ke stolu?',
              segments: [
                segment('al-banco', 'Al banco', ['banco'], ['prepositions']),
                segment('o', 'o', ['o']),
                segment('al-tavolo', 'al tavolo', ['tavolo'], ['prepositions']),
              ],
            },
          ],
        },
      ],
    },
    grammarTopics: [
      { id: 'greetings', title: 'Pozdravy', summary: 'Pozdravy.' },
      { id: 'formal-lei', title: 'Vykání', summary: 'Lei.' },
      { id: 'conditional', title: 'Vorrei', summary: 'Zdvořilá žádost.' },
      { id: 'article', title: 'Neurčitý člen', summary: 'un, una.' },
      { id: 'prepositions', title: 'Předložka + člen', summary: 'al, alla.' },
    ],
    lexemes: [
      {
        id: 'buongiorno',
        lemma: 'buongiorno',
        translation: 'dobrý den',
        partOfSpeech: 'interjection',
      },
      { id: 'cosa', lemma: 'cosa', translation: 'co', partOfSpeech: 'pronoun' },
      { id: 'desiderare', lemma: 'desiderare', translation: 'přát si', partOfSpeech: 'verb' },
      { id: 'volere', lemma: 'volere', translation: 'chtít', partOfSpeech: 'verb' },
      { id: 'cappuccino', lemma: 'cappuccino', translation: 'cappuccino', partOfSpeech: 'noun' },
      { id: 'pizza', lemma: 'pizza', translation: 'pizza', partOfSpeech: 'noun' },
      { id: 'e', lemma: 'e', translation: 'a', partOfSpeech: 'conjunction' },
      { id: 'o', lemma: 'o', translation: 'nebo', partOfSpeech: 'conjunction' },
      { id: 'banco', lemma: 'banco', translation: 'pult', partOfSpeech: 'noun' },
      { id: 'tavolo', lemma: 'tavolo', translation: 'stůl', partOfSpeech: 'noun' },
    ],
    ...(practice !== undefined && { practice }),
  });
}

const random = () => seededRandom(7);

function only<T extends Exercise['type']>(exercises: Exercise[], type: T) {
  return exercises.filter(
    (exercise): exercise is Extract<Exercise, { type: T }> => exercise.type === type,
  );
}

describe('generated practice', () => {
  it('asks every word with the answer among distinct options', () => {
    const exercises = only(generateExercises(createBundle(), 'vocabulary', random()), 'choice');

    expect(exercises).toHaveLength(10);
    for (const exercise of exercises) {
      expect(exercise.options).toContain(exercise.answer);
      expect(new Set(exercise.options.map(normalizeText)).size).toBe(exercise.options.length);
      expect(exercise.itemKey).toMatch(/^vocabulary:al-bar:/);
    }
    const [first, second] = exercises;
    expect(first).toMatchObject({
      prompt: { text: 'buongiorno', language: 'it' },
      answer: 'dobrý den',
    });
    expect(second).toMatchObject({ prompt: { text: 'co', language: 'cs' }, answer: 'cosa' });
  });

  it('answers the other speaker with the first sentence of the next turn', () => {
    const exercises = only(generateExercises(createBundle(), 'dialogue', random()), 'choice');

    expect(exercises.map((exercise) => exercise.answer)).toEqual([
      'Vorrei un cappuccino e una pizza.',
      'Al banco o al tavolo?',
    ]);
    expect(exercises[0]?.context).toEqual({ speaker: 'Barista', italian: 'Cosa desidera?' });
    expect(exercises[0]?.options).not.toContain('Cosa desidera?');
  });

  it('plays each sentence and offers Czech meanings, never two that differ only in punctuation', () => {
    const exercises = only(generateExercises(createBundle(), 'listening', random()), 'choice');

    expect(exercises).toHaveLength(4);
    expect(exercises[0]).toMatchObject({
      prompt: null,
      audio: 'Buongiorno!',
      answer: 'Dobrý den!',
    });
  });

  it('blanks grammar-linked segments, with options in the case of the gap', () => {
    const exercises = only(generateExercises(createBundle(), 'grammar', random()), 'fill_in_blank');
    const tavolo = exercises.find((exercise) => exercise.answer === 'al tavolo');

    expect(tavolo).toMatchObject({
      before: 'Al banco o ',
      after: '?',
      czech: 'U baru, nebo ke stolu?',
    });
    expect(tavolo?.options).toContain('al banco');
    expect(tavolo?.grammarTopicIds).toEqual(['prepositions']);
    expect(exercises.some((exercise) => exercise.answer === 'e')).toBe(false);
  });

  it('builds sentences of two or more segments from tiles, the first one lower-case', () => {
    const exercises = only(generateExercises(createBundle(), 'translation', random()), 'build');
    const vorrei = exercises.find((exercise) => exercise.czech.startsWith('Dal bych'));

    expect(exercises).toHaveLength(3);
    expect(vorrei?.answer).toEqual(['vorrei', 'un cappuccino', 'e', 'una pizza']);
    expect(vorrei?.tiles).toHaveLength(6);
    expect(vorrei !== undefined && isCorrectAnswer(vorrei, vorrei.answer)).toBe(true);
    expect(vorrei !== undefined && isCorrectAnswer(vorrei, [...vorrei.answer].reverse())).toBe(
      false,
    );
  });

  it('leaves out what the lecturer excluded', () => {
    const bundle = createBundle({
      excludedSentenceIds: ['al-banco'],
      excludedLexemeIds: ['cosa', 'gone'],
    });

    expect(generateExercises(bundle, 'vocabulary', random()).map((e) => e.itemKey)).not.toContain(
      'vocabulary:al-bar:cosa',
    );
    expect(generateExercises(bundle, 'listening', random())).toHaveLength(3);
    expect(
      generateExercises(bundle, 'grammar', random()).some((e) =>
        e.solution.czech.startsWith('U baru'),
      ),
    ).toBe(false);
  });

  it('filters by lesson and grammar topic', () => {
    const bundles = [createBundle()];

    expect(
      practiceCandidates(bundles, { kind: 'grammar', grammarTopicId: 'article' }, random()),
    ).toHaveLength(2);
    expect(
      practiceCandidates(bundles, { kind: 'grammar', lessonId: 'other' }, random()),
    ).toHaveLength(0);
  });
});

describe('review schedule', () => {
  const now = new Date('2026-11-27T10:00:00Z');

  it('moves a right answer to a longer pause and a wrong one back to the start', () => {
    const first = review(undefined, 'k', true, now);
    const second = review(first, 'k', true, now);
    const forgotten = review(second, 'k', false, now);

    expect(first).toMatchObject({ box: 1, dueAt: '2026-11-28T10:00:00.000Z', correct: 1 });
    expect(second).toMatchObject({ box: 2, dueAt: '2026-11-30T10:00:00.000Z', correct: 2 });
    expect(forgotten).toMatchObject({ box: 0, dueAt: now.toISOString(), wrong: 1 });
    expect(isDue(undefined, now)).toBe(true);
    expect(isDue(first, now)).toBe(false);
    expect(isDue(forgotten, now)).toBe(true);
  });

  it('plans new and overdue items first and counts what is due', () => {
    const bundles = [createBundle()];
    const candidates = practiceCandidates(bundles, { kind: 'vocabulary' }, random());
    const known = new Map(
      candidates
        .slice(0, 8)
        .map((exercise) => [exercise.itemKey, review(undefined, exercise.itemKey, true, now)]),
    );

    const session = planSession(candidates, known, random(), 3);

    expect(session.map((e) => e.itemKey).sort()).toEqual(
      [
        candidates[8]?.itemKey,
        candidates[9]?.itemKey,
        session.find((e) => known.has(e.itemKey))?.itemKey,
      ].sort(),
    );
    expect(countPractice(bundles, known, now).vocabulary).toEqual({ total: 10, due: 2 });
  });
});

describe('practice session', () => {
  it('checks an answer, records the result and finishes after the last exercise', () => {
    const [exercise] = generateExercises(createBundle(), 'vocabulary', random());
    if (exercise?.type !== 'choice') throw new Error('expected a choice');
    let state = startSession([exercise]);

    expect(canCheck(state)).toBe(false);
    state = practiceSessionReducer(state, { type: 'select', option: exercise.answer });
    state = practiceSessionReducer(state, { type: 'check' });
    // Answers are locked once checked.
    state = practiceSessionReducer(state, { type: 'select', option: 'other' });

    expect(state.checked).toBe(true);
    expect(currentAnswer(state)).toBe(exercise.answer);
    expect(state.results).toEqual([
      { exerciseId: exercise.id, itemKey: exercise.itemKey, correct: true },
    ]);
    expect(isSessionFinished(practiceSessionReducer(state, { type: 'next' }))).toBe(true);
  });

  it('places and removes tiles; each tile only once', () => {
    const exercise = only(generateExercises(createBundle(), 'translation', random()), 'build')[0];
    if (exercise === undefined) throw new Error('expected a build exercise');
    let state = startSession([exercise]);

    state = practiceSessionReducer(state, { type: 'placeTile', tile: 0 });
    state = practiceSessionReducer(state, { type: 'placeTile', tile: 0 });
    state = practiceSessionReducer(state, { type: 'placeTile', tile: 1 });
    state = practiceSessionReducer(state, { type: 'removeTile', position: 0 });

    expect(state.placed).toEqual([1]);
    state = practiceSessionReducer(state, { type: 'check' });
    expect(state.checked).toBe(false);
  });
});

describe('text comparison', () => {
  it('ignores case, punctuation and apostrophe style but not accents', () => {
    expect(sameText('Buongiorno!', 'buongiorno.')).toBe(true);
    expect(sameText('un’amica', "un'amica")).toBe(true);
    expect(sameText('è', 'e')).toBe(false);
  });
});
