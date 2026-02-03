/**
 * Zotero Name Normalizer Integration Test Infrastructure
 *
 * This directory contains infrastructure for testing the Zotero Name Normalizer extension
 * within Zotero's actual JavaScript context.
 *
 * Files:
 * - run-tests.js: Test runner using file-based output (requires -js flag to work)
 * - run-tests-playwright.js: Playwright-based test runner
 * - run-tests-simple.js: Simple test runner using Zotero.quit()
 * - profile/: Test profile directory
 *
 * Usage:
 *   npm run test:zotero        # Run integration tests
 *
 * Note: The -js flag in Zotero 7 doesn't output to stdout/stderr as expected.
 * For full integration testing, consider using:
 * 1. Zotero's built-in testing framework
 * 2. A custom test extension with UI tests
 * 3. Remote debugging protocol
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_FILE = path.join(__dirname, 'test-results.json');

/**
 * Quick verification that extension is loaded
 * Run with: node tests/zotero-integration/index.js
 */
async function verifyExtension() {
  console.log('Zotero Name Normalizer Extension Verification');
  console.log('='.repeat(50));

  // Check that built files exist
  const requiredFiles = [
    'content/scripts/zotero-ner-bundled.js',
    'content/scripts/zotero-ner.js',
    'bootstrap.js',
    'manifest.json'
  ];

  let allExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    const exists = fs.existsSync(filePath);
    const symbol = exists ? '[OK]' : '[MISSING]';
    console.log('  ' + symbol + ' ' + file);
    if (!exists) allExist = false;
  }

  console.log('');

  // Check bootstrap.js has test exports
  const bootstrapPath = path.join(PROJECT_ROOT, 'bootstrap.js');
  if (fs.existsSync(bootstrapPath)) {
    const content = fs.readFileSync(bootstrapPath, 'utf8');
    const hasTests = content.includes('ZoteroNERTests');
    console.log('  ' + (hasTests ? '[OK]' : '[MISSING]') + ' Test runner exported');
  }

  console.log('');
  console.log('='.repeat(50));

  if (allExist) {
    console.log('Extension files verified. Install the extension in Zotero');
    console.log('and use the unit tests (npm run test:unit) for validation.');
    return 0;
  } else {
    console.log('Some files are missing. Run npm run build first.');
    return 1;
  }
}

if (require.main === module) {
  verifyExtension().then(code => process.exit(code));
}

module.exports = { verifyExtension };
