import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        fetch: 'readonly',
        Response: 'readonly',
        RequestInit: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        console: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      semi: ['error', 'always'],
      curly: ['error', 'multi-or-nest'],
      quotes: ['error', 'single'],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'space-before-function-paren': ['error', 'always'],
      indent: ['error', 2],
      'comma-dangle': ['error', 'never'],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
];
