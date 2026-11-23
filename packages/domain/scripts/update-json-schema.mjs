// Regenerates the committed lesson-bundle JSON Schema copies (see lesson-bundle-json-schema.test.ts).
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['jest', 'lesson-bundle-json-schema'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, UPDATE_JSON_SCHEMA: '1' },
});
process.exit(result.status ?? 1);
