// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier/flat';
import { configs as tsConfigs } from 'typescript-eslint';

const TS_FILES = ['**/*.ts', '**/*.tsx'];

/** Architectural import boundaries (docs/ARCHITECTURE.md §3). */
const featureDeepImports = {
  group: ['@/features/*/*'],
  message: 'Import other features only through their public index (`@/features/<name>`).',
};

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.expo/**',
    '**/dist/**',
    '**/coverage/**',
    '**/expo-env.d.ts',
    'apps/*/ios/**',
    'apps/*/android/**',
  ]),

  ...expoConfig,

  // eslint-plugin-react's version auto-detection is incompatible with ESLint 10; pin explicitly
  // (keep in sync with the `react` version in apps/mobile/package.json).
  { settings: { react: { version: '19.3' } } },

  {
    files: TS_FILES,
    extends: [tsConfigs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: { project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'] },
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': ['error', { patterns: [featureDeepImports] }],
    },
  },

  // Shared design system: framework-agnostic of the app (no app aliases, no routing).
  {
    files: ['packages/design-system/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/*'], message: 'The design system must not depend on the app.' },
            {
              group: ['expo-router', 'expo-router/*'],
              message: 'No navigation in the design system.',
            },
          ],
        },
      ],
    },
  },

  // Core is the foundation features build on; it must not depend on features.
  {
    files: ['apps/mobile/src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            featureDeepImports,
            { group: ['@/features', '@/features/*'], message: 'core/ must not import features.' },
          ],
        },
      ],
    },
  },

  // Tests may use non-null assertions and unbound jest mocks freely.
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // Plain JS config files are not part of any tsconfig project.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tsConfigs.disableTypeChecked],
  },

  prettierConfig,
]);
