import { z } from 'zod';

import { AppError, toAppError } from '@/core/errors';

const catalogEntrySchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  checksum: z.string().min(1),
  publishedAt: z.string(),
  titleItalian: z.string(),
  titleCzech: z.string(),
  level: z.string(),
});

/** The newest published version of a lesson, as the API's catalog lists it. */
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

const catalogSchema = z.object({ lessons: z.array(catalogEntrySchema) });

const lessonVersionSchema = z.object({
  lessonId: z.string(),
  version: z.number().int().positive(),
  checksum: z.string().min(1),
  bundle: z.unknown(),
});

export interface DownloadedLesson {
  checksum: string;
  /** Unvalidated lesson bundle JSON. */
  bundle: unknown;
}

/** Published lessons on the RICI API (`/api/v1/content`). Every method rejects with an AppError. */
export interface ContentApi {
  fetchCatalog(): Promise<readonly CatalogEntry[]>;
  fetchLessonVersion(lessonId: string, version: number): Promise<DownloadedLesson>;
}

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * `getToken` gives the signed-in student's session token: with it, the catalog also lists the
 * lessons the student's lecturers recommended, including lessons for students only (ADR-0013).
 */
export function createContentApi(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  getToken: () => Promise<string | null> = () => Promise.resolve(null),
): ContentApi {
  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const token = await getToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/api/v1/content${path}`, {
        headers: {
          Accept: 'application/json',
          ...(token !== null && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      });
    } catch (error) {
      throw new AppError(
        'network',
        `Cannot reach the lesson server: ${toAppError(error).message}`,
        {
          cause: error,
        },
      );
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 404) {
      throw new AppError('notFound', `The lesson server has no ${path}.`);
    }
    if (!response.ok) {
      const kind = response.status >= 500 ? 'network' : 'unexpected';
      throw new AppError(kind, `The lesson server answered ${response.status} for ${path}.`);
    }
    try {
      return schema.parse(await response.json());
    } catch (error) {
      throw new AppError('validation', `Unexpected answer from the lesson server for ${path}.`, {
        cause: error,
      });
    }
  }

  return {
    async fetchCatalog() {
      return (await get('/lessons', catalogSchema)).lessons;
    },
    async fetchLessonVersion(lessonId, version) {
      const path = `/lessons/${encodeURIComponent(lessonId)}/versions/${version}`;
      const body = await get(path, lessonVersionSchema);
      if (body.lessonId !== lessonId || body.version !== version) {
        throw new AppError('validation', `The lesson server sent another lesson than ${path}.`);
      }
      return { checksum: body.checksum, bundle: body.bundle };
    },
  };
}
