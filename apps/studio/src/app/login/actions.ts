'use server';

import { redirect } from 'next/navigation';

import { t } from '@/i18n';
import { safeNextPath } from '@/lib/next-path';
import { clearSessionCookie, getSessionToken, setSessionCookie } from '@/lib/session';
import { signIn, signOut, StudioApiError } from '@/lib/studio-api';

export interface LoginState {
  error?: string;
  email?: string;
}

const MAX_FIELD_LENGTH = 512;

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH) : '';
}

export async function loginAction(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = formText(form, 'email').trim();
  const password = formText(form, 'password');
  if (email === '' || password === '') {
    return { error: t('login.missing'), email };
  }
  try {
    const signedIn = await signIn(email, password);
    await setSessionCookie(signedIn.token, new Date(signedIn.expiresAt));
  } catch (error) {
    if (!(error instanceof StudioApiError)) throw error;
    if (error.status === 401) return { error: t('login.invalid'), email };
    if (error.status === 429) {
      const minutes = Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60));
      return { error: t('login.tooManyAttempts', { minutes }), email };
    }
    return { error: t('login.unavailable'), email };
  }
  redirect(safeNextPath(formText(form, 'next')));
}

/** Ends the session in the API (so a copied cookie stops working) and in the browser. */
export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  if (token !== null) {
    try {
      await signOut(token);
    } catch (error) {
      // The cookie is cleared anyway; an unreachable API must not keep the lecturer signed in
      // in this browser. The session then ends on its own after its idle timeout.
      if (!(error instanceof StudioApiError)) throw error;
    }
  }
  await clearSessionCookie();
  redirect('/login');
}
