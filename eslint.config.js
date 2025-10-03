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
  // Stepwise rollout: enforce no-console only on migrated files
  {
    files: [
      'src/pages/api/admin/backup.ts',
      'src/pages/api/comments/performance.ts',
      'src/pages/api/data-export/index.ts',
    ],
    rules: {
      'no-console': ['error', { allow: [] }],
    },
  }
);
