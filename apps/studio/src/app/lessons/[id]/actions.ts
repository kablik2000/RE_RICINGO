'use server';

import type { LessonBundle } from '@ricingo/domain';

import {
  getLesson,
  type LessonDetail,
  type LessonIssue,
  type LessonSummary,
  publishLesson,
  saveLesson,
  StudioApiError,
} from '@/lib/studio-api';

export type SaveResult =
  { ok: true; lesson: LessonSummary; issues: LessonIssue[] } | { ok: false; message: string };

export type PublishResult =
  { ok: true; detail: LessonDetail } | { ok: false; message: string; issues: LessonIssue[] };

/** Saves the editor's draft; incomplete drafts are stored and their problems returned. */
export async function saveDraftAction(id: string, draft: LessonBundle): Promise<SaveResult> {
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
