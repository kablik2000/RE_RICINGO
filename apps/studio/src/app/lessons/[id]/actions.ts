'use server';

import type { LessonBundle } from '@ricingo/domain';

import { requireTeacher } from '@/lib/auth';
import {
  deleteLesson,
  getLesson,
  type LessonDetail,
  type LessonIssue,
  type LessonSummary,
  publishLesson,
  saveLesson,
  setLessonVisibility,
  StudioApiError,
  unpublishLesson,
} from '@/lib/studio-api';

/**
 * Server Actions are public HTTP endpoints: each checks the session itself and the type of what
 * the browser sent (the API then checks the session and the lesson's organization again).
 */
async function authorize(id: unknown): Promise<string> {
  await requireTeacher();
  if (typeof id !== 'string' || id === '' || id.length > 100) {
    throw new Error('Invalid lesson id.');
  }
  return id;
}

export type SaveResult =
  { ok: true; lesson: LessonSummary; issues: LessonIssue[] } | { ok: false; message: string };

export type UnpublishResult = { ok: true; lesson: LessonSummary } | { ok: false; message: string };

export type PublishResult =
  { ok: true; detail: LessonDetail } | { ok: false; message: string; issues: LessonIssue[] };

/** Saves the editor's draft; incomplete drafts are stored and their problems returned. */
export async function saveDraftAction(id: string, draft: LessonBundle): Promise<SaveResult> {
  await authorize(id);
  try {
    const result = await saveLesson(id, draft);
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof StudioApiError) return { ok: false, message: error.message };
    throw error;
  }
}

/** Publishes the saved draft as the next version and returns the lesson as stored afterwards. */
export async function publishAction(id: string): Promise<PublishResult> {
  await authorize(id);
  try {
    await publishLesson(id);
    return { ok: true, detail: await getLesson(id) };
  } catch (error) {
    if (error instanceof StudioApiError) {
      return { ok: false, message: error.message, issues: [...error.issues] };
    }
    throw error;
  }
}

/** Withdraws the lesson from students (it disappears from their devices on the next check). */
export async function unpublishAction(id: string): Promise<UnpublishResult> {
  await authorize(id);
  try {
    return { ok: true, lesson: await unpublishLesson(id) };
  } catch (error) {
    if (error instanceof StudioApiError) return { ok: false, message: error.message };
    throw error;
  }
}

export type VisibilityResult = { ok: true; lesson: LessonSummary } | { ok: false; message: string };

/** Makes the lesson public or students-only (ADR-0013). */
export async function setVisibilityAction(
  id: string,
  visibility: unknown,
): Promise<VisibilityResult> {
  await authorize(id);
  if (visibility !== 'public' && visibility !== 'students') {
    throw new Error('Invalid visibility.');
  }
  try {
    return { ok: true, lesson: await setLessonVisibility(id, visibility) };
  } catch (error) {
    if (error instanceof StudioApiError) return { ok: false, message: error.message };
    throw error;
  }
}

export type DeleteResult = { ok: true } | { ok: false; message: string };

/** Deletes the lesson from the Studio (a draft for good, an unpublished lesson is archived). */
export async function deleteLessonAction(id: string): Promise<DeleteResult> {
  await authorize(id);
  try {
    await deleteLesson(id);
    return { ok: true };
  } catch (error) {
    if (error instanceof StudioApiError) return { ok: false, message: error.message };
    throw error;
  }
}
