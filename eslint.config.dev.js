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
      // Relaxed rules for development
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for faster development
      '@typescript-eslint/no-unused-vars': 'off', // Don't block on unused vars during development
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions

      // Keep important rules but as warnings
      'no-console': 'warn', // Warn about console.log but don't block
      'no-debugger': 'warn', // Warn about debugger statements

      // Import rules relaxed
      'import/no-unresolved': 'off',

      // Prettier as warning only
      'prettier/prettier': 'warn',

      // React Hooks still strict
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
  }
);
