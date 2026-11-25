import { filterLessons, parseLessonFilter } from './lesson-filter';
import {
  deleteLesson,
  fetchCurrentTeacher,
  inviteStudent,
  listLessons,
  load,
  type LessonSummary,
  recommend,
  saveLesson,
  signIn,
  signStudentOutEverywhere,
  StudioApiError,
  unpublishLesson,
} from './studio-api';

vi.mock('./session', () => ({ getSessionToken: () => Promise.resolve('session-token') }));

const AL_BAR: LessonSummary = {
  id: 'al-bar',
  titleItalian: 'Al bar',
  titleCzech: 'V kavárně',
  level: 'A1',
  goal: 'Objednat si kávu.',
  sentenceCount: 12,
  exchangeCount: 4,
  lexemeCount: 21,
  grammarTopicCount: 7,
  status: 'published',
  publishedVersion: 1,
  visibility: 'public',
  updatedAt: '2026-11-23T10:00:00+00:00',
};

function respondWith(body: unknown, status = 200) {
  return vi.fn(() => Promise.resolve(Response.json(body, { status })));
}

describe('studio API client', () => {
  it('reads lesson summaries', async () => {
    const fetchImpl = respondWith({ lessons: [AL_BAR] });

    await expect(listLessons(fetchImpl)).resolves.toEqual([AL_BAR]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/studio/lessons',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('turns API errors, including lesson issues, into StudioApiError', async () => {
    const fetchImpl = respondWith(
      {
        error: {
          code: 'validation',
          message: 'The lesson has problems.',
          issues: [{ path: '$.lexemes[0]', message: "'lemma' is a required property" }],
        },
      },
      422,
    );

    const error = await saveLesson('al-bar', {} as never, fetchImpl).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(StudioApiError);
    expect(error).toMatchObject({ status: 422, issues: [{ path: '$.lexemes[0]' }] });
  });

  it('unpublishes a lesson', async () => {
    const hidden = { ...AL_BAR, status: 'unpublished' };
    const fetchImpl = respondWith({ lesson: hidden });

    await expect(unpublishLesson('al-bar', fetchImpl)).resolves.toEqual(hidden);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/studio/lessons/al-bar/unpublish',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deletes a lesson (204 No Content)', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

    await expect(deleteLesson('bar', fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/studio/lessons/bar',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('sends the session token to the API', async () => {
    const fetchImpl = respondWith({ lessons: [] });

    await listLessons(fetchImpl);

    const init = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init[1].headers).get('Authorization')).toBe('Bearer session-token');
  });

  it('signs in without a token and reports throttling with its wait time', async () => {
    const fetchImpl = respondWith(
      { error: { code: 'too_many_attempts', message: 'Too many.', retryAfter: 600 } },
      429,
    );

    const error = await signIn('lektorka@example.test', 'heslo', fetchImpl).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ status: 429, retryAfter: 600 });
    const init = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[0]).toBe('http://localhost:8000/api/v1/auth/login');
    expect(new Headers(init[1].headers).has('Authorization')).toBe(false);
  });

  it('asks the API who is signed in', async () => {
    const teacher = {
      id: 'u1',
      email: 'lektorka@example.test',
      displayName: 'Lektorka',
      organizationId: 'o1',
    };
    const fetchImpl = respondWith({ teacher });

    await expect(fetchCurrentTeacher('abc', fetchImpl)).resolves.toEqual(teacher);
  });

  it('passes the API error code of a refused invitation', async () => {
    const fetchImpl = respondWith(
      { error: { code: 'consent_required', message: 'Consent needed.' } },
      422,
    );

    const error = await inviteStudent(
      { email: 'jan@example.test', displayName: 'Jan', isMinor: true, parentalConsent: false },
      fetchImpl,
    ).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 422, code: 'consent_required' });
  });

  it('signs a student out everywhere', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

    await signStudentOutEverywhere('s1', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/studio/students/s1/sessions',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('recommends words of a lesson to a student', async () => {
    const created = {
      id: 'r1',
      kind: 'vocabulary',
      teacherName: 'Lektorka',
      lesson: { id: 'al-bar', titleItalian: 'Al bar', titleCzech: 'V kavárně', level: 'A1' },
      grammarTopic: null,
      words: [{ id: 'volere', lemma: 'volere', translation: 'chtít' }],
      note: null,
      createdAt: '2026-11-25T10:00:00+00:00',
      available: true,
    };
    const fetchImpl = respondWith({ recommendation: created }, 201);

    await expect(
      recommend('s1', { kind: 'vocabulary', lessonId: 'al-bar', wordIds: ['volere'] }, fetchImpl),
    ).resolves.toEqual(created);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/studio/students/s1/recommendations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'vocabulary', lessonId: 'al-bar', wordIds: ['volere'] }),
      }),
    );
  });

  it('reports an unreachable backend as a value pages can render', async () => {
    const unreachable = vi.fn(() => Promise.reject(new TypeError('fetch failed')));

    const result = await load(listLessons(unreachable));

    expect(result).toMatchObject({ ok: false, error: { status: 0, message: 'fetch failed' } });
  });
});

describe('lesson filter', () => {
  const draft: LessonSummary = {
    ...AL_BAR,
    id: 'alla-stazione',
    titleItalian: 'Alla stazione',
    titleCzech: 'Na nádraží',
    status: 'draft',
    publishedVersion: null,
  };

  it('filters by status and by title without diacritics', () => {
    expect(filterLessons([AL_BAR, draft], 'draft', '').map((lesson) => lesson.id)).toEqual([
      'alla-stazione',
    ]);
    expect(filterLessons([AL_BAR, draft], 'all', 'nadrazi').map((lesson) => lesson.id)).toEqual([
      'alla-stazione',
    ]);
    expect(parseLessonFilter('nonsense')).toBe('all');
    expect(parseLessonFilter('unpublished')).toBe('unpublished');
  });
});
