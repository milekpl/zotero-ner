// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        Zotero: 'readonly',
        ZoteroNER: 'readonly',
        Services: 'readonly',
        Components: 'readonly',
        window: 'readonly',
        document: 'readonly',
      }
    },
    rules: {
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      'no-empty': 'warn',
    },
  }
];