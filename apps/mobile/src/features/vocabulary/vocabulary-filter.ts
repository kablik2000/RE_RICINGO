import type { VocabularyEntry } from '@/data';

/** What the vocabulary list shows: everything, one lesson, or a word class. */
export type VocabularyFilter =
  | { kind: 'all' }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'nouns' }
  | { kind: 'verbs' }
  | { kind: 'phrases' };

/** Combining diacritical marks left after NFD decomposition (an explicit range works on Hermes). */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Lower-case and without diacritics, so "caffe" finds "caffè" and "kava" finds "káva". */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLocaleLowerCase('cs');
}

function matchesFilter(entry: VocabularyEntry, filter: VocabularyFilter): boolean {
  switch (filter.kind) {
    case 'all':
      return true;
    case 'lesson':
      return entry.lessonId === filter.lessonId;
    case 'nouns':
      return entry.lexeme.partOfSpeech === 'noun';
    case 'verbs':
      return entry.lexeme.partOfSpeech === 'verb';
    case 'phrases':
      return entry.lexeme.partOfSpeech !== 'noun' && entry.lexeme.partOfSpeech !== 'verb';
  }
}

/** Entries matching the filter whose Italian lemma or Czech translation contains the query. */
export function filterVocabulary(
  entries: readonly VocabularyEntry[],
  query: string,
  filter: VocabularyFilter,
): VocabularyEntry[] {
  const needle = normalizeForSearch(query.trim());
  return entries.filter(
    (entry) =>
      matchesFilter(entry, filter) &&
      (needle === '' ||
        normalizeForSearch(entry.lexeme.lemma).includes(needle) ||
        normalizeForSearch(entry.lexeme.translation).includes(needle)),
  );
}

export interface VocabularySection {
  /** Upper-case first letter of the lemma (without diacritics). */
  initial: string;
  entries: VocabularyEntry[];
}

/** Alphabetical sections by the lemma's first letter, sorted by lemma (Italian collation). */
export function groupByInitial(entries: readonly VocabularyEntry[]): VocabularySection[] {
  const sorted = [...entries].sort((a, b) => a.lexeme.lemma.localeCompare(b.lexeme.lemma, 'it'));
  const sections: VocabularySection[] = [];
  for (const entry of sorted) {
    const initial = normalizeForSearch(entry.lexeme.lemma).charAt(0).toLocaleUpperCase('it');
    const last = sections.at(-1);
    if (last?.initial === initial) {
      last.entries.push(entry);
    } else {
      sections.push({ initial, entries: [entry] });
    }
  }
  return sections;
}
