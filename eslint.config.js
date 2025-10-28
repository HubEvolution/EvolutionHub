import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['~/*'],
              message: 'Please use the "@/*" alias instead of "~/*" for consistency.',
            },
          ],
        },
      ],
      'import/no-unresolved': 'off',
      'prettier/prettier': 'warn',
      // Allow intentionally empty catch blocks to keep runtime behavior
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // React Hooks best practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
  // Ignore noisy rules in compile-time shims/stubs only (do not affect production src files)
  {
    files: [
      'src/types/ts-src-shims.d.ts',
      'src/types/stubs/**/*',
      'src/lib/services/provider-error.d.ts',
      'src/lib/utils/id-generator.d.ts',
      'src/lib/security/*.d.ts',
      'src/lib/rate-limiter.d.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-restricted-imports': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'prettier/prettier': 'off',
    },
  },
  // Stepwise rollout: enforce no-console only on migrated files
  {
    files: [
      'src/pages/api/admin/backup.ts',
      'src/pages/api/comments/performance.ts',
      'src/pages/api/data-export/index.ts',
      'src/middleware.ts',
    ],
    rules: {
      'no-console': ['error'],
    },
  },
  // Tests: allow require() in test files to support tooling patterns
  {
    files: [
      '**/*.{test,spec}.ts',
      '**/*.{test,spec}.tsx',
      'tests/**/*.ts',
      'tests/**/*.tsx',
      'test-suite-v2/**/*.ts',
      'test-suite-v2/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  }
);
