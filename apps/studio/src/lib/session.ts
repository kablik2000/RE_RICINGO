import 'server-only';

import { cookies } from 'next/headers';

import { SECURE_COOKIES, SESSION_COOKIE } from './session-cookie';

/**
 * The session token lives only in an `httpOnly` cookie: page scripts cannot read it, and
 * `SameSite=Strict` keeps other sites from sending it (CSRF). The Studio's server forwards it to
 * the API as a bearer token; the browser never talks to the API.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: SECURE_COOKIES,
  sameSite: 'strict',
  path: '/',
} as const;

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, expires: expiresAt });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}
