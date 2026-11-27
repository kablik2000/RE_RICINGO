import type { LessonBundle } from '@ricingo/domain';

import { describeIssue, translateIssueMessage } from './issues';
import {
  addLexeme,
  addSegment,
  addSentence,
  addTurn,
  itemIds,
  removeLexeme,
  removeSentence,
  setPracticeExcluded,
  slugify,
  uniqueId,
  updateSegment,
  updateSentence,
} from './lesson-draft';

function emptyLesson(): LessonBundle {
  return {
    contentSchemaVersion: 1,
    lesson: {
      id: 'alla-stazione',
      version: 1,
      level: 'A1',
      titleItalian: 'Alla stazione',
      titleCzech: 'Na nádraží',
      goal: '',
      speakers: [
        { id: 'speaker-1', label: 'Pokladní' },
        { id: 'speaker-2', label: 'Cestující' },
      ],
      turns: [],
    },
    grammarTopics: [],
    lexemes: [],
  };
}

describe('lesson draft operations', () => {
  it('leaves sentences and words out of practice and forgets them when they are removed', () => {
    const withTurn = addTurn(emptyLesson());
    const { sentenceId } = withTurn;
    const { bundle, lexemeId } = addLexeme(withTurn.bundle);

    const excluded = setPracticeExcluded(
      setPracticeExcluded(bundle, 'sentence', sentenceId, true),
      'lexeme',
      lexemeId,
      true,
    );
    expect(excluded.practice).toEqual({
      excludedSentenceIds: [sentenceId],
      excludedLexemeIds: [lexemeId],
    });
    expect(setPracticeExcluded(excluded, 'sentence', sentenceId, true)).toBe(excluded);

    const cleaned = removeLexeme(removeSentence(excluded, sentenceId), lexemeId);
    expect(cleaned.practice).toBeUndefined();
  });

  it('makes schema-valid, unique IDs', () => {
    expect(slugify('Un caffè, per favore!')).toBe('un-caffe-per-favore');
    expect(slugify('!!!')).toBe('item');
    expect(uniqueId('turn-1', new Set(['turn-1', 'turn-1-2']))).toBe('turn-1-3');
  });

  it('adds turns with alternating speakers and an empty first sentence', () => {
    const first = addTurn(emptyLesson());
    const second = addTurn(first.bundle);

    expect(second.bundle.lesson.turns.map((turn) => turn.speakerId)).toEqual([
      'speaker-1',
      'speaker-2',
    ]);
    expect(first.sentenceId).toBe('turn-1-sentence-1');
    expect(second.bundle.lesson.turns[1]?.sentences).toHaveLength(1);
  });

  it('adds segments only for text in the sentence, kept in reading order', () => {
    const { bundle, sentenceId } = addTurn(emptyLesson());
    const written = updateSentence(bundle, sentenceId, { italian: 'Un biglietto per Roma.' });

    expect(addSegment(written, sentenceId, 'Milano')).toBeNull();
    const roma = addSegment(written, sentenceId, 'per Roma');
    const ticket = roma && addSegment(roma.bundle, sentenceId, 'Un biglietto');

    const segments = ticket?.bundle.lesson.turns[0]?.sentences[0]?.segments ?? [];
    expect(segments.map((segment) => segment.text)).toEqual(['Un biglietto', 'per Roma']);
    expect(itemIds(ticket?.bundle ?? written).has('turn-1-sentence-1-per-roma')).toBe(true);
  });

  it('stores explanations without empty optional layers', () => {
    const { bundle, sentenceId } = addTurn(emptyLesson());
    const written = updateSentence(bundle, sentenceId, { italian: 'Vorrei un biglietto.' });
    const added = addSegment(written, sentenceId, 'Vorrei');
    if (added === null) throw new Error('segment expected');

    const updated = updateSegment(added.bundle, sentenceId, added.segmentId, {
      meaning: 'chtěl bych',
      grammar: 'condizionale',
      depth: '   ',
      annotation: '',
    });

    const segment = updated.lesson.turns[0]?.sentences[0]?.segments[0];
    expect(segment?.explanation).toEqual({ meaning: 'chtěl bych', grammar: 'condizionale' });
    expect(segment).not.toHaveProperty('annotation');
  });

  it('removes references when a lexeme is deleted', () => {
    const withLexeme = addLexeme(emptyLesson());
    const { bundle, sentenceId } = addTurn(withLexeme.bundle);
    const written = updateSentence(bundle, sentenceId, { italian: 'Biglietto.' });
    const added = addSegment(written, sentenceId, 'Biglietto');
    if (added === null) throw new Error('segment expected');
    const linked = updateSegment(added.bundle, sentenceId, added.segmentId, {
      lexemeIds: [withLexeme.lexemeId],
    });

    const removed = removeLexeme(linked, withLexeme.lexemeId);

    expect(removed.lexemes).toEqual([]);
    expect(removed.lesson.turns[0]?.sentences[0]?.segments[0]?.lexemeIds).toEqual([]);
  });

  it('adds sentences to an existing turn', () => {
    const { bundle } = addTurn(emptyLesson());
    const result = addSentence(bundle, 'turn-1');

    expect(result.sentenceId).toBe('turn-1-sentence-2');
    expect(result.bundle.lesson.turns[0]?.sentences).toHaveLength(2);
  });
});

describe('issue descriptions', () => {
  it('locates dialogue issues and points the editor at the sentence', () => {
    const { bundle, sentenceId } = addTurn(emptyLesson());

    expect(
      describeIssue(
        {
          path: '$.lesson.turns[0].sentences[0].segments[1]',
          message: "'meaning' is a required property",
        },
        bundle,
      ),
    ).toEqual({
      location: 'Replika 1 · věta 1 · část 2',
      message: 'Chybí význam.',
      tab: 'dialog',
      sentenceId,
    });
  });

  it('sends vocabulary and lesson-info issues to their tabs', () => {
    const bundle = emptyLesson();

    expect(describeIssue({ path: '$.lexemes[2]', message: 'x' }, bundle)).toMatchObject({
      location: 'Slovíčko 3',
      tab: 'vocabulary',
    });
    expect(describeIssue({ path: '$.lesson.goal', message: 'x' }, bundle).tab).toBe('info');
  });

  it('explains a sentence without parts', () => {
    const { bundle, sentenceId } = addTurn(emptyLesson());

    expect(
      describeIssue(
        { path: '$.lesson.turns[0].sentences[0].segments', message: '[] should be non-empty' },
        bundle,
      ),
    ).toEqual({
      location: 'Replika 1 · věta 1',
      message:
        'Věta nemá žádné části. V poli „Části věty“ napište úsek italské věty a klikněte na Přidat část.',
      tab: 'dialog',
      sentenceId,
    });
  });

  it('translates known messages and keeps unknown ones', () => {
    expect(translateIssueMessage('[] should be non-empty')).toBe('Seznam je prázdný.');
    expect(translateIssueMessage('[] should be non-empty', 'turns')).toBe(
      'Dialog nemá žádnou repliku.',
    );
    expect(translateIssueMessage('unknown lexeme "volere"')).toBe(
      'Odkaz na neexistující slovíčko „volere“.',
    );
    expect(translateIssueMessage('something new')).toBe('something new');
  });
});
