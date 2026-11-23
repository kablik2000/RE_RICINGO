import { filterLessons, parseLessonFilter } from './lesson-filter';
import { listLessons, load, type LessonSummary, saveLesson, StudioApiError } from './studio-api';

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
  });
});
