import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { lessonBundleJsonSchema, lessonBundleJsonSchemaText } from './lesson-bundle-json-schema';

/**
 * The generated JSON Schema is committed in two places: next to the domain package and inside
 * the Flask API (whose Docker build context is services/api only). This test keeps both copies
 * identical to the zod schema; run `pnpm --filter @ricingo/domain schema:update` after changing it.
 */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SCHEMA_COPIES = [
  join(REPO_ROOT, 'packages', 'domain', 'schema', 'lesson-bundle.schema.json'),
  join(REPO_ROOT, 'services', 'api', 'src', 'rici_api', 'schemas', 'lesson-bundle.schema.json'),
];

describe('lesson bundle JSON Schema', () => {
  it('describes the bundle as draft 2020-12 with the required top-level fields', () => {
    const schema = lessonBundleJsonSchema();

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.required).toEqual(
      expect.arrayContaining(['contentSchemaVersion', 'lesson', 'grammarTopics', 'lexemes']),
    );
  });

  it.each(SCHEMA_COPIES)('is up to date in %s', (path) => {
    const expected = lessonBundleJsonSchemaText();
    if (process.env.UPDATE_JSON_SCHEMA === '1') {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, expected);
    }

    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8').replace(/\r\n/g, '\n')).toBe(expected);
  });
});
