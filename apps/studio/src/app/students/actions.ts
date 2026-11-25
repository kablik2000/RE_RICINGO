'use server';

import { redirect } from 'next/navigation';

import { t, type TranslationKey } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import {
  inviteStudent,
  removeStudent,
  resendInvitation,
  revokeInvitation,
  signStudentOutEverywhere,
  StudioApiError,
} from '@/lib/studio-api';

export interface InviteState {
  error?: string;
  values?: { displayName: string; email: string; isMinor: boolean };
}

export type ActionResult = { ok: true } | { ok: false; message: string };

const MAX_FIELD_LENGTH = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The API's error codes for invitations, as Czech messages. */
const INVITE_ERRORS: Readonly<Record<string, TranslationKey>> = {
  invalid_email: 'students.errors.invalidEmail',
  name_required: 'students.errors.nameRequired',
  consent_required: 'students.errors.consentRequired',
  too_many_invitations: 'students.errors.tooMany',
  studio_account: 'students.errors.studioAccount',
  already_student: 'students.errors.alreadyStudent',
  already_invited: 'students.errors.alreadyInvited',
  mail_failed: 'students.errors.mailFailed',
};

function errorMessage(error: StudioApiError): string {
  const key = error.code === undefined ? undefined : INVITE_ERRORS[error.code];
  return key === undefined ? t('students.errors.failed', { message: error.message }) : t(key);
}

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH).trim() : '';
}

/** Server Actions are public endpoints: check the session and the shape of every argument. */
async function authorize(id: unknown): Promise<string> {
  await requireTeacher();
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Invalid id.');
  return id;
}

export async function inviteAction(_previous: InviteState, form: FormData): Promise<InviteState> {
  await requireTeacher();
  const values = {
    displayName: formText(form, 'displayName'),
    email: formText(form, 'email'),
    isMinor: form.get('isMinor') === 'on',
  };
  const parentalConsent = form.get('parentalConsent') === 'on';
  if (values.displayName === '' || values.email === '') {
    return { error: t('students.errors.missing'), values };
  }
  if (values.isMinor && !parentalConsent) {
    return { error: t('students.errors.consentRequired'), values };
  }
  try {
    await inviteStudent({ ...values, parentalConsent: values.isMinor && parentalConsent });
  } catch (error) {
    if (error instanceof StudioApiError) return { error: errorMessage(error), values };
    throw error;
  }
  redirect('/students?invited=1');
}

async function run(task: () => Promise<void>): Promise<ActionResult> {
  try {
    await task();
    return { ok: true };
  } catch (error) {
    if (error instanceof StudioApiError) return { ok: false, message: errorMessage(error) };
    throw error;
  }
}

export async function resendAction(id: string): Promise<ActionResult> {
  const invitationId = await authorize(id);
  return run(() => resendInvitation(invitationId));
}

export async function revokeAction(id: string): Promise<ActionResult> {
  const invitationId = await authorize(id);
  return run(() => revokeInvitation(invitationId));
}

export async function removeStudentAction(id: string): Promise<ActionResult> {
  const studentId = await authorize(id);
  return run(() => removeStudent(studentId));
}

export async function signOutEverywhereAction(id: string): Promise<ActionResult> {
  const studentId = await authorize(id);
  return run(() => signStudentOutEverywhere(studentId));
}
