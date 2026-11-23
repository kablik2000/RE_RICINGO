// @ts-check
// ESLint 10 picks the nearest config per file, so this one applies to the Studio only.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import { configs as tsConfigs } from 'typescript-eslint';

export default defineConfig([
  // Two TypeScript roots exist (repo and Studio); every file here belongs to the Studio.
  {
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
    settings: { next: { rootDir: import.meta.dirname } },
  },
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tsConfigs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,mts}'],
    extends: [tsConfigs.disableTypeChecked],
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  prettierConfig,
]);
