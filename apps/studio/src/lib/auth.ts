import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { getSessionToken } from './session';
import { fetchCurrentTeacher, StudioApiError, type Teacher } from './studio-api';

/**
 * The signed-in teacher, or null. The API decides (session valid, not idle, account active);
 * the cookie alone proves nothing. Memoised per render pass.
 */
export const getTeacher = cache(async (): Promise<Teacher | null> => {
  const token = await getSessionToken();
  if (token === null) return null;
  try {
    return await fetchCurrentTeacher(token);
  } catch (error) {
    if (error instanceof StudioApiError && error.status === 401) return null;
    throw error;
  }
});

/**
 * Every page and Server Action of the Studio starts with this (Data Access Layer): it does not
 * rely on the proxy's redirect, which only looks at whether a cookie exists.
 */
export async function requireTeacher(): Promise<Teacher> {
  const teacher = await getTeacher();
  if (teacher === null) redirect('/login');
  return teacher;
}
