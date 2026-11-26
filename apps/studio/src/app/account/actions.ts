'use server';

import { t, type TranslationKey } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import { changePassword, StudioApiError } from '@/lib/studio-api';

export interface PasswordState {
  error?: string;
  changed?: boolean;
}

/** The API's longest accepted password; longer input is refused here without a request. */
const MAX_PASSWORD_LENGTH = 128;

/** The API's error codes for a new password, as Czech messages. */
const PASSWORD_ERRORS: Readonly<Record<string, TranslationKey>> = {
  wrong_password: 'account.errors.wrongPassword',
  password_too_short: 'account.errors.tooShort',
  password_too_long: 'account.errors.tooLong',
  password_is_email: 'account.errors.isEmail',
  password_too_repetitive: 'account.errors.tooRepetitive',
};

function password(form: FormData, name: string): string {
  const value = form.get(name);
  // Passwords are not trimmed: spaces are allowed characters.
  return typeof value === 'string' ? value : '';
}

function errorMessage(error: StudioApiError): string {
  if (error.status === 429) {
    const minutes = Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60));
    return t('account.errors.tooManyAttempts', { minutes: String(minutes) });
  }
  const key = error.code === undefined ? undefined : PASSWORD_ERRORS[error.code];
  return key === undefined ? t('account.errors.failed', { message: error.message }) : t(key);
}

/** Server Actions are public endpoints: the session is checked first, then every field. */
export async function changePasswordAction(
  _previous: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  await requireTeacher();
  const current = password(form, 'currentPassword');
  const next = password(form, 'newPassword');
  const repeated = password(form, 'repeatPassword');
  if (current === '' || next === '' || repeated === '') {
    return { error: t('account.errors.missing') };
  }
  if (next !== repeated) return { error: t('account.errors.mismatch') };
  if (next.length > MAX_PASSWORD_LENGTH) return { error: t('account.errors.tooLong') };
  try {
    await changePassword(current.slice(0, MAX_PASSWORD_LENGTH + 1), next);
  } catch (error) {
    if (error instanceof StudioApiError) return { error: errorMessage(error) };
    throw error;
  }
  return { changed: true };
}
