import type { LessonBundle } from '@ricingo/domain';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import 'server-only';

import { apiBaseUrl } from './api-status';
import { getSessionToken } from './session';

/**
 * Teacher Studio endpoints of the Flask API (`/api/v1/studio`, ADR-0011) and sign-in
 * (`/api/v1/auth`, ADR-0012). Server-side only: requests carry the lecturer's session token.
 */

export const lessonStatusSchema = z.enum(['draft', 'published', 'changed', 'unpublished']);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

export const lessonSummarySchema = z.object({
  id: z.string(),
  titleItalian: z.string(),
  titleCzech: z.string(),
  level: z.string(),
  goal: z.string(),
  sentenceCount: z.number(),
  exchangeCount: z.number(),
  lexemeCount: z.number(),
  grammarTopicCount: z.number(),
  status: lessonStatusSchema,
  publishedVersion: z.number().nullable(),
  updatedAt: z.string(),
});
export type LessonSummary = z.infer<typeof lessonSummarySchema>;

export const issueSchema = z.object({ path: z.string(), message: z.string() });
export type LessonIssue = z.infer<typeof issueSchema>;

const overviewSchema = z.object({
  lessons: z.object({ total: z.number(), published: z.number(), withDraftChanges: z.number() }),
  publishedLexemes: z.number(),
  publishedGrammarTopics: z.number(),
  students: z.number(),
});
export type StudioOverview = z.infer<typeof overviewSchema>;

const lessonDetailSchema = z.object({
  lesson: lessonSummarySchema,
  // Drafts may be incomplete, so they are not validated against the strict lesson schema here;
  // the API stores them in the lesson-bundle shape and reports what is still missing (`issues`).
  draft: z.record(z.string(), z.unknown()),
  issues: z.array(issueSchema),
});

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(issueSchema).optional(),
    retryAfter: z.number().optional(),
  }),
});

const teacherSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  organizationId: z.string(),
});
export type Teacher = z.infer<typeof teacherSchema>;

export class StudioApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: readonly LessonIssue[] = [],
    /** Seconds until sign-in may be tried again (HTTP 429). */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'StudioApiError';
  }
}

/** Parses a successful response body; `null` stands for "no content" (204). */
/**
 * Calls `/api/v1{path}`. `token` is the session token to send; `undefined` reads it from the
 * session cookie (Studio endpoints), `null` sends none (sign-in).
 */
async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const sessionToken = token === undefined ? await getSessionToken() : token;
  if (sessionToken !== null) headers.set('Authorization', `Bearer ${sessionToken}`);
  let response: Response;
  try {
    response = await fetchImpl(`${apiBaseUrl()}/api/v1${path}`, {
      ...init,
      cache: 'no-store',
      headers,
    });
  } catch (error) {
    throw new StudioApiError(error instanceof Error ? error.message : String(error), 0);
  }
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body);
    throw new StudioApiError(
      parsed.success ? parsed.data.error.message : `HTTP ${String(response.status)}`,
      response.status,
      parsed.success ? (parsed.data.error.issues ?? []) : [],
      parsed.success ? parsed.data.error.retryAfter : undefined,
    );
  }
  return schema.parse(body);
}

function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  return apiRequest(`/studio${path}`, schema, init, fetchImpl);
}

const signedInSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string(),
  teacher: teacherSchema,
});
export type SignedIn = z.infer<typeof signedInSchema>;

/** Checks the credentials with the API; rejects with status 401 (wrong) or 429 (throttled). */
export function signIn(
  email: string,
  password: string,
  fetchImpl?: typeof fetch,
): Promise<SignedIn> {
  return apiRequest(
    '/auth/login',
    signedInSchema,
    { method: 'POST', body: JSON.stringify({ email, password }) },
    fetchImpl,
    null,
  );
}

export async function signOut(token: string, fetchImpl?: typeof fetch): Promise<void> {
  await apiRequest('/auth/logout', z.null(), { method: 'POST' }, fetchImpl, token);
}

export async function fetchCurrentTeacher(
  token: string,
  fetchImpl?: typeof fetch,
): Promise<Teacher> {
  const body = await apiRequest(
    '/auth/me',
    z.object({ teacher: teacherSchema }),
    {},
    fetchImpl,
    token,
  );
  return body.teacher;
}

export function getOverview(fetchImpl?: typeof fetch): Promise<StudioOverview> {
  return request('/overview', overviewSchema, {}, fetchImpl);
}

export async function listLessons(fetchImpl?: typeof fetch): Promise<LessonSummary[]> {
  const body = await request(
    '/lessons',
    z.object({ lessons: z.array(lessonSummarySchema) }),
    {},
    fetchImpl,
  );
  return body.lessons;
}

export interface LessonDetail {
  lesson: LessonSummary;
  draft: LessonBundle;
  issues: LessonIssue[];
}

export async function getLesson(id: string, fetchImpl?: typeof fetch): Promise<LessonDetail> {
  const body = await request(
    `/lessons/${encodeURIComponent(id)}`,
    lessonDetailSchema,
    {},
    fetchImpl,
  );
  return { ...body, draft: body.draft as unknown as LessonBundle };
}

export function saveLesson(
  id: string,
  draft: LessonBundle,
  fetchImpl?: typeof fetch,
): Promise<{ lesson: LessonSummary; issues: LessonIssue[] }> {
  return request(
    `/lessons/${encodeURIComponent(id)}`,
    z.object({ lesson: lessonSummarySchema, issues: z.array(issueSchema) }),
    { method: 'PUT', body: JSON.stringify({ draft }) },
    fetchImpl,
  );
}

export async function publishLesson(id: string, fetchImpl?: typeof fetch): Promise<LessonSummary> {
  const body = await request(
    `/lessons/${encodeURIComponent(id)}/publish`,
    z.object({ lesson: lessonSummarySchema }),
    { method: 'POST' },
    fetchImpl,
  );
  return body.lesson;
}

/** Deletes a draft, or archives an unpublished lesson (published versions are immutable). */
export async function deleteLesson(id: string, fetchImpl?: typeof fetch): Promise<void> {
  await request(`/lessons/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' }, fetchImpl);
}

/** Withdraws a published lesson from students; its draft and versions are kept. */
export async function unpublishLesson(
  id: string,
  fetchImpl?: typeof fetch,
): Promise<LessonSummary> {
  const body = await request(
    `/lessons/${encodeURIComponent(id)}/unpublish`,
    z.object({ lesson: lessonSummarySchema }),
    { method: 'POST' },
    fetchImpl,
  );
  return body.lesson;
}

export async function createLesson(
  input: { titleItalian: string; titleCzech: string; level: string },
  fetchImpl?: typeof fetch,
): Promise<string> {
  const body = await request(
    '/lessons',
    z.object({ id: z.string() }),
    { method: 'POST', body: JSON.stringify(input) },
    fetchImpl,
  );
  return body.id;
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: StudioApiError };

/** Awaits a Studio API call, turning API failures into a value pages can render. */
export async function load<T>(promise: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    if (error instanceof StudioApiError) {
      // The session ended (idle, signed out elsewhere, password changed): sign in again.
      if (error.status === 401) redirect('/login');
      return { ok: false, error };
    }
    throw error;
  }
}
