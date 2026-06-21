'use strict';

// Shared base ESLint config (classic eslintrc format, ESLint 8).
// Apps/packages extend this and add environment-specific configs.
module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'rahi'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    // Repository pattern enforcement — promoted to error in Phase 1 (rahi-docs/10).
    'rahi/no-direct-db-write-outside-repo': 'error',

    // No `any` without an inline justification — reviewer checks for `// reason:`.
    '@typescript-eslint/no-explicit-any': 'warn',

    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  ignorePatterns: ['dist/', 'build/', '.expo/', 'node_modules/', '*.config.js'],
};
