// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // Changed from 'off' to 'warn'
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Async/Promise rules - important for NestJS
      '@typescript-eslint/no-floating-promises': 'error', // Changed from 'warn' to 'error'
      '@typescript-eslint/no-misused-promises': 'error',

      // Type safety rules
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
    },
  },
  {
    // Test file specific rules
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off', // Jest mocks cause false positives
      '@typescript-eslint/no-unsafe-argument': 'off', // Common in test mocks and API responses
      '@typescript-eslint/no-unsafe-assignment': 'off', // Common in test mocks and API responses
      '@typescript-eslint/no-unsafe-member-access': 'off', // Common in test mocks and API responses
      '@typescript-eslint/no-unsafe-call': 'off', // Common in test mocks and API responses
    },
  },
);
