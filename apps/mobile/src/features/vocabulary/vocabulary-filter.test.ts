import type { Lexeme } from '@ricingo/domain';

import type { VocabularyEntry } from '@/data';

import { filterVocabulary, groupByInitial, normalizeForSearch } from './vocabulary-filter';

function entry(lexeme: Partial<Lexeme> & Pick<Lexeme, 'id' | 'lemma'>, lessonId = 'al-bar') {
  return {
    lexeme: { translation: lexeme.lemma, partOfSpeech: 'noun', ...lexeme },
    lessonId,
    lessonTitle: lessonId,
    sentences: [],
  } satisfies VocabularyEntry;
}

const entries = [
  entry({ id: 'caffe', lemma: 'caffè', translation: 'káva' }),
  entry({ id: 'volere', lemma: 'volere', translation: 'chtít', partOfSpeech: 'verb' }),
  entry({ id: 'certo', lemma: 'certo', translation: 'jistě', partOfSpeech: 'adverb' }),
  entry({ id: 'binario', lemma: 'binario', translation: 'nástupiště' }, 'in-stazione'),
];

const ids = (items: readonly VocabularyEntry[]) => items.map((item) => item.lexeme.id);

describe('vocabulary filter', () => {
  it('ignores case and diacritics', () => {
    expect(normalizeForSearch('Caffè Káva')).toBe('caffe kava');
  });

  it('searches Italian lemmas and Czech translations', () => {
    expect(ids(filterVocabulary(entries, 'caffe', { kind: 'all' }))).toEqual(['caffe']);
    expect(ids(filterVocabulary(entries, ' KAVA ', { kind: 'all' }))).toEqual(['caffe']);
    expect(filterVocabulary(entries, 'pizza', { kind: 'all' })).toEqual([]);
  });

  it('filters by lesson and word class', () => {
    expect(ids(filterVocabulary(entries, '', { kind: 'lesson', lessonId: 'in-stazione' }))).toEqual(
      ['binario'],
    );
    expect(ids(filterVocabulary(entries, '', { kind: 'nouns' }))).toEqual(['caffe', 'binario']);
    expect(ids(filterVocabulary(entries, '', { kind: 'verbs' }))).toEqual(['volere']);
    expect(ids(filterVocabulary(entries, '', { kind: 'phrases' }))).toEqual(['certo']);
  });

  it('groups alphabetically by initial', () => {
    expect(
      groupByInitial(entries).map((section) => [section.initial, ids(section.entries)]),
    ).toEqual([
      ['B', ['binario']],
      ['C', ['caffe', 'certo']],
      ['V', ['volere']],
    ]);
  });
});
