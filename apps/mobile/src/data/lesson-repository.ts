import type { CefrLevel, LessonBundle, LessonTheme, Lexeme, Sentence } from '@ricingo/domain';

/** Lesson as shown in lists, without the full dialogue. */
export interface LessonSummary {
  id: string;
  titleItalian: string;
  titleCzech: string;
  level: CefrLevel;
  theme: LessonTheme | null;
  goal: string;
  exchangeCount: number;
  sentenceCount: number;
}

/** A dictionary entry with the context the student met it in (spec §5). */
export interface VocabularyEntry {
  lexeme: Lexeme;
  lessonId: string;
  lessonTitle: string;
  sentences: readonly Sentence[];
}

/**
 * Access to published lesson content. Screens never know where content comes from: today a
 * bundled demo, from M2 the Supabase `api_v1` with an offline cache (ADR-0002, ADR-0003).
 * Every method rejects with an `AppError`.
 */
export interface LessonRepository {
  listLessons(): Promise<readonly LessonSummary[]>;
  getLessonBundle(lessonId: string): Promise<LessonBundle>;
  listVocabulary(): Promise<readonly VocabularyEntry[]>;
}
