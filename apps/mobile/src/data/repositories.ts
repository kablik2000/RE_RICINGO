import alBar from './demo/al-bar.lesson.json';
import { createBundledLessonRepository } from './demo/bundled-lesson-repository';
import type { LessonRepository } from './lesson-repository';

/**
 * Composition root of the data layer. DEMO: lessons come from content bundled with the app;
 * M2 replaces this with a Supabase-backed repository without changing any screen.
 */
export const lessonRepository: LessonRepository = createBundledLessonRepository([alBar]);
