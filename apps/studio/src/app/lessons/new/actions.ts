'use server';

import { redirect } from 'next/navigation';

import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import { createLesson, StudioApiError } from '@/lib/studio-api';

export interface CreateLessonState {
  error?: string;
}

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/** Creates an empty draft and opens it in the editor. */
export async function createLessonAction(
  _previous: CreateLessonState,
  form: FormData,
): Promise<CreateLessonState> {
  await requireTeacher();
  const titleItalian = formText(form, 'titleItalian');
  const titleCzech = formText(form, 'titleCzech');
  const levelValue = formText(form, 'level');
  const level = LEVELS.has(levelValue) ? levelValue : 'A1';

  let id: string;
  try {
    id = await createLesson({ titleItalian, titleCzech, level });
  } catch (error) {
    if (error instanceof StudioApiError) {
      return { error: t('newLesson.failed', { message: error.message }) };
    }
    throw error;
  }
  redirect(`/lessons/${id}`);
}
