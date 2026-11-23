import { CONTENT_SCHEMA_VERSION } from './lesson-bundle';
import {
  countExchanges,
  findLexemeOccurrences,
  listSentencesInOrder,
  splitSentenceIntoPieces,
} from './lesson-queries';
import { validateLessonBundle } from './validate-lesson-bundle';

function createBundle() {
  return {
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
              id: 'cosa-desidera',
              italian: 'Cosa desidera?',
              czech: 'Co si přejete?',
              segments: [
                { id: 'cosa', text: 'Cosa', explanation: { meaning: 'co' } },
                {
                  id: 'desidera',
                  text: 'desidera',
                  explanation: { meaning: 'přejete si' },
                  lexemeIds: ['desiderare'],
                  grammarTopicIds: ['formal-lei'],
                },
              ],
            },
          ],
        },
        {
          id: 'turn-2',
          speakerId: 'customer',
          sentences: [
            {
              id: 'un-caffe',
              italian: 'Un caffè.',
              czech: 'Kávu.',
              segments: [
                { id: 'un-caffe-seg', text: 'Un caffè', explanation: { meaning: 'jedna káva' } },
              ],
            },
          ],
        },
      ],
    },
    grammarTopics: [{ id: 'formal-lei', title: 'Vykání', summary: 'Lei + 3. osoba j. č.' }],
    lexemes: [
      {
        id: 'desiderare',
        lemma: 'desiderare',
        translation: 'přát si',
        partOfSpeech: 'verb',
      },
    ],
  };
}

describe('validateLessonBundle', () => {
  it('accepts a consistent bundle and fills defaults', () => {
    const result = validateLessonBundle(createBundle());

    expect(result.ok).toBe(true);
    if (result.ok) {
      const firstSegment = result.bundle.lesson.turns[0]?.sentences[0]?.segments[0];
      expect(firstSegment?.lexemeIds).toEqual([]);
    }
  });

  it('rejects schema violations with a path', () => {
    const bundle = createBundle();
    bundle.lesson.level = 'Z9';

    const result = validateLessonBundle(bundle);

    expect(result).toEqual({
      ok: false,
      issues: [expect.objectContaining({ path: 'lesson.level' })],
    });
  });

  it('reports unknown references', () => {
    const bundle = createBundle();
    bundle.lexemes = [];
    bundle.grammarTopics = [];
    const turn = bundle.lesson.turns[1];
    if (turn) turn.speakerId = 'waiter';

    const result = validateLessonBundle(bundle);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.message)).toEqual([
        'unknown lexeme "desiderare"',
        'unknown grammar topic "formal-lei"',
        'unknown speaker "waiter"',
      ]);
    }
  });

  it('reports segments that do not match the sentence text', () => {
    const bundle = createBundle();
    const segments = bundle.lesson.turns[0]?.sentences[0]?.segments;
    segments?.reverse();

    const result = validateLessonBundle(bundle);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.message).toMatch(/segment "Cosa" is not found/);
    }
  });

  it('reports duplicate stable ids', () => {
    const bundle = createBundle();
    const sentence = bundle.lesson.turns[1]?.sentences[0];
    if (sentence) sentence.id = 'cosa-desidera';

    const result = validateLessonBundle(bundle);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        path: 'lesson',
        message: 'duplicate item id "cosa-desidera"',
      });
    }
  });
});

describe('lesson queries', () => {
  const result = validateLessonBundle(createBundle());
  if (!result.ok) throw new Error('fixture must be valid');
  const { bundle } = result;

  it('lists sentences in reading order with their speaker', () => {
    const sentences = listSentencesInOrder(bundle.lesson);

    expect(sentences.map((item) => [item.index, item.speaker.label, item.sentence.id])).toEqual([
      [0, 'Barista', 'cosa-desidera'],
      [1, 'Zákazník', 'un-caffe'],
    ]);
  });

  it('counts exchanges as pairs of turns', () => {
    expect(countExchanges(bundle.lesson)).toBe(1);
  });

  it('finds the sentences where a lexeme occurs', () => {
    const [occurrence] = findLexemeOccurrences(bundle);

    expect(occurrence?.lexeme.id).toBe('desiderare');
    expect(occurrence?.sentences.map((sentence) => sentence.id)).toEqual(['cosa-desidera']);
  });

  it('splits a sentence into segments and the text between them', () => {
    const [first, second] = listSentencesInOrder(bundle.lesson);
    if (first === undefined || second === undefined) throw new Error('fixture has two sentences');

    expect(
      splitSentenceIntoPieces(first.sentence).map((piece) => [piece.kind, piece.text]),
    ).toEqual([
      ['segment', 'Cosa'],
      ['gap', ' '],
      ['segment', 'desidera'],
      ['gap', '?'],
    ]);
    expect(
      splitSentenceIntoPieces(second.sentence)
        .map((piece) => piece.text)
        .join(''),
    ).toBe('Un caffè.');
  });
});
