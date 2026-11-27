import { lessonThemeSchema, type CefrLevel, type LessonTheme } from '@ricingo/domain';

import { t } from '@/core/i18n';
import type { LessonSummary } from '@/data';

export const LESSON_THEMES: readonly LessonTheme[] = lessonThemeSchema.options;

export function themeLabel(theme: LessonTheme | null): string {
  return theme === null ? t('lessons.themes.none') : t(`lessons.themes.${theme}`);
}

/** Themes the lessons cover, in the catalogue order of themes. */
export function themesOf(lessons: readonly LessonSummary[]): LessonTheme[] {
  return LESSON_THEMES.filter((theme) => lessons.some((lesson) => lesson.theme === theme));
}

const LEVEL_ORDER: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function levelsOf(lessons: readonly LessonSummary[]): CefrLevel[] {
  return LEVEL_ORDER.filter((level) => lessons.some((lesson) => lesson.level === level));
}

/** Easier lessons first; the catalogue order otherwise (stable sort). */
export function byLevel(lessons: readonly LessonSummary[]): LessonSummary[] {
  return [...lessons].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
}
