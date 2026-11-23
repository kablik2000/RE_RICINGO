import { z } from 'zod';

import { CONTENT_SCHEMA_VERSION, lessonBundleSchema } from './lesson-bundle';

/**
 * The lesson bundle schema as JSON Schema (draft 2020-12), for non-TypeScript consumers — the
 * Flask API validates published lessons with it (ADR-0010). Describes the *input* shape, i.e.
 * what an author or the Studio sends (fields with defaults are optional).
 *
 * Generated, never edited by hand: `pnpm --filter @ricingo/domain schema:update`.
 */
export function lessonBundleJsonSchema(): Record<string, unknown> {
  return {
    $id: `https://rici.local/schemas/lesson-bundle.v${String(CONTENT_SCHEMA_VERSION)}.json`,
    title: 'Lesson bundle',
    ...z.toJSONSchema(lessonBundleSchema, { io: 'input', target: 'draft-2020-12' }),
  };
}

/** Pretty-printed, stable JSON text as stored in the repository. */
export function lessonBundleJsonSchemaText(): string {
  return `${JSON.stringify(lessonBundleJsonSchema(), null, 2)}\n`;
}
