'use server';

import { revalidatePath } from 'next/cache';

import { t, type TranslationKey } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import {
  recommend,
  type RecommendationKind,
  recommendationKindSchema,
  removeRecommendation,
  StudioApiError,
} from '@/lib/studio-api';

import type { ActionResult } from '../actions';

export interface RecommendState {
  ok?: boolean;
  error?: string;
  /** Grows with every saved recommendation, so the form can start over. */
  saved: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lesson, topic and word IDs are lowercase kebab-case (lesson bundle schema). */
const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ID_LENGTH = 100;
const MAX_WORDS = 200;
const MAX_NOTE_LENGTH = 500;

const ERRORS: Readonly<Record<string, TranslationKey>> = {
  lesson_not_published: 'student.errors.lessonNotPublished',
  unknown_topic: 'student.errors.unknown',
  unknown_words: 'student.errors.unknown',
  words_required: 'student.errors.wordsRequired',
  already_recommended: 'student.errors.alreadyRecommended',
  too_many: 'student.errors.tooMany',
  note_too_long: 'student.errors.noteTooLong',
};

function errorMessage(error: StudioApiError): string {
  const key = error.code === undefined ? undefined : ERRORS[error.code];
  return key === undefined ? t('student.errors.failed', { message: error.message }) : t(key);
}

function isContentId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_ID_LENGTH && CONTENT_ID.test(value);
}

/** Server Actions are public endpoints: check the session and the shape of every argument. */
async function authorize(...ids: unknown[]): Promise<string[]> {
  await requireTeacher();
  return ids.map((id) => {
    if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Invalid id.');
    return id;
  });
}

export async function recommendAction(
  studentId: string,
  previous: RecommendState,
  form: FormData,
): Promise<RecommendState> {
  const [id] = await authorize(studentId);
  const parsedKind = recommendationKindSchema.safeParse(form.get('kind'));
  const lessonId = form.get('lessonId');
  if (!parsedKind.success || !isContentId(lessonId) || id === undefined) {
    return { error: t('student.errors.missing'), saved: previous.saved };
  }
  const kind: RecommendationKind = parsedKind.data;
  const topic = form.get('grammarTopicId');
  const wordIds = form.getAll('wordIds').filter(isContentId).slice(0, MAX_WORDS);
  const note = form.get('note');
  const noteText = typeof note === 'string' ? note.trim() : '';
  if (noteText.length > MAX_NOTE_LENGTH) {
    return { error: t('student.errors.noteTooLong'), saved: previous.saved };
  }
  if (kind === 'vocabulary' && wordIds.length === 0) {
    return { error: t('student.errors.wordsRequired'), saved: previous.saved };
  }
  try {
    await recommend(id, {
      kind,
      lessonId,
      ...(kind === 'practice' && isContentId(topic) && { grammarTopicId: topic }),
      ...(kind === 'vocabulary' && { wordIds }),
      ...(noteText !== '' && { note: noteText }),
    });
  } catch (error) {
    if (error instanceof StudioApiError) {
      return { error: errorMessage(error), saved: previous.saved };
    }
    throw error;
  }
  revalidatePath(`/students/${id}`);
  return { ok: true, saved: previous.saved + 1 };
}

export async function removeRecommendationAction(
  studentId: string,
  recommendationId: string,
): Promise<ActionResult> {
  const [student, recommendation] = await authorize(studentId, recommendationId);
  if (student === undefined || recommendation === undefined) throw new Error('Invalid id.');
  try {
    await removeRecommendation(student, recommendation);
  } catch (error) {
    if (error instanceof StudioApiError) return { ok: false, message: errorMessage(error) };
    throw error;
  }
  revalidatePath(`/students/${student}`);
  return { ok: true };
}
