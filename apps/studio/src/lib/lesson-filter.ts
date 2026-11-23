import type { LessonSummary } from './studio-api';

export type LessonFilter = 'all' | 'published' | 'changed' | 'draft' | 'unpublished';

const FILTERS: readonly LessonFilter[] = ['all', 'published', 'changed', 'draft', 'unpublished'];

export function parseLessonFilter(value: string | undefined): LessonFilter {
  return FILTERS.find((filter) => filter === value) ?? 'all';
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('cs');
}

/** Lessons matching the status filter whose titles or goal contain `query` (no diacritics). */
export function filterLessons(
  lessons: readonly LessonSummary[],
  filter: LessonFilter,
  query: string,
): LessonSummary[] {
  const needle = normalize(query.trim());
  return lessons.filter(
    (lesson) =>
      (filter === 'all' || lesson.status === filter) &&
      (needle === '' ||
        [lesson.titleItalian, lesson.titleCzech, lesson.goal].some((text) =>
          normalize(text).includes(needle),
        )),
  );
}
