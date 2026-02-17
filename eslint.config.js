// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
export default [
  {
    ignores: [
      'tests/zotero-framework/profile/**',
      'tests/zotero-framework/test-manual-profile/**',
      'tests/automation/test-profile/**',
      'tests/verify-profile/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      '.history/**',
      '**/*.json',
      '.scaffold/**',
      'tests/zotero/**/*.test.js',
      'tests/zotero-integration/**',
      'content/scripts/zotero-ner-bundled.js',
      'content/scripts/ner-normalization-dialog.js',
      'content/scripts/normalization-dialog-controller.js',
      'tests/zotero-framework/test/tests/**/*.js',
      'content/scripts/zotero-ner.js',
      'tests/zotero-framework/test/content/**',
      'tests/zotero-framework/test/resource/**',
      'coverage/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        TextEncoder: 'readonly',
        // Zotero globals
        Zotero: 'readonly',
        ZoteroNER: 'readonly',
        ZoteroPane: 'readonly',
        Services: 'readonly',
        Components: 'readonly',
        // Test globals
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        global: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        assert: 'readonly',
        ZoteroNameNormalizer: 'readonly',
        zoteroNameNormalizerScope: 'readonly',
      }
    },
    rules: {
      'indent': 'off', // Disabled for CI - pre-existing formatting issues
      'linebreak-style': 'off', // Disabled for CI compatibility
      'quotes': 'off', // Disabled - pre-existing inconsistencies
      'semi': ['error', 'always'],
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      'no-empty': 'warn',
    },
  }
];