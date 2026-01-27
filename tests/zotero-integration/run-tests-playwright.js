/**
 * Zotero Integration Test Runner using Playwright
 *
 * Runs tests within Zotero's actual JavaScript context via browser automation.
 *
 * Usage: node tests/zotero-integration/run-tests.js [--watch]
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ZOTERO_PATH = process.env.ZOTERO_PATH || '/Applications/Zotero.app/Contents/MacOS/zotero';
const PROFILE_PATH = process.env.ZOTERO_PROFILE || path.join(os.homedir(), 'Library', 'Application Support', 'Zotero', 'Profiles', 'ugqxjkh5.default');

/**
 * Test definitions - code that runs in Zotero context
 */
const TEST_DEFINITIONS = {
  testZoteroLoaded: {
    name: 'Zotero Loaded',
    code: `
      typeof Zotero !== 'undefined' && { success: true, version: Zotero.version }
    `
  },

  testExtensionLoaded: {
    name: 'Extension Loaded',
    code: `
      typeof Zotero !== 'undefined' && Zotero.NER && { success: true, initialized: Zotero.NER.initialized }
    `
  },

  testLearningEngine: {
    name: 'Learning Engine',
    code: `
      if (!Zotero.NER.learningEngine) {
        throw new Error('Learning engine not initialized');
      }
      Zotero.NER.learningEngine.storeMapping('Smyth', 'Smith', 0.9);
      const mappings = Zotero.NER.learningEngine.getMapping('Smyth');
      { success: mappings && mappings.normalized === 'Smith', mappings: mappings }
    `
  },

  testNameParser: {
    name: 'Name Parser',
    code: `
      if (!Zotero.NER.nameParser) {
        throw new Error('Name parser not initialized');
      }
      const parsed = Zotero.NER.nameParser.parse('John Smith');
      { success: parsed.lastName === 'Smith', parsed: parsed }
    `
  },

  testCandidateFinder: {
    name: 'Candidate Finder',
    code: `
      if (!Zotero.NER.candidateFinder) {
        throw new Error('Candidate finder not initialized');
      }
      const surnames = ['Smith', 'Smyth', 'Smythe'];
      const candidates = Zotero.NER.candidateFinder.findPotentialVariants(surnames);
      { success: true, candidateCount: candidates ? candidates.length : 0 }
    `
  },

  testDBAnalyzer: {
    name: 'DB Analyzer',
    code: `
      if (!Zotero.NER.menuIntegration) {
        throw new Error('Menu integration not initialized');
      }
      { success: !!Zotero.NER.menuIntegration.zoteroDBAnalyzer }
    `
  },

  testLibraryAccess: {
    name: 'Library Access',
    code: `
      if (!Zotero.Libraries) {
        throw new Error('Zotero Libraries not available');
      }
      const userLibraryID = Zotero.Libraries.userLibraryID;
      { success: typeof userLibraryID === 'number', libraryID: userLibraryID }
    `
  }
};

/**
 * Run a single test in Zotero's context
 */
async function runTest(page, testName) {
  const test = TEST_DEFINITIONS[testName];
  if (!test) {
    return { name: testName, success: false, error: 'Unknown test' };
  }

  try {
    const result = await page.evaluate((code) => {
      try {
        return eval(code);
      } catch (e) {
        return { success: false, error: e.message, stack: e.stack };
      }
    }, test.code);

    return { name: testName, ...result };
  } catch (e) {
    return { name: testName, success: false, error: e.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests(options = {}) {
  const { headless = true, timeout = 60000 } = options;

  console.log('='.repeat(60));
  console.log('Zotero NER Integration Tests (Playwright)');
  console.log('='.repeat(60));
  console.log(`Zotero: ${ZOTERO_PATH}`);
  console.log(`Profile: ${PROFILE_PATH}`);
  console.log('');

  // Check if profile exists
  if (!fs.existsSync(PROFILE_PATH)) {
    console.error('Error: Zotero profile not found at:', PROFILE_PATH);
    console.error('Please set ZOTERO_PROFILE environment variable');
    return { passed: 0, failed: 1, total: 0, error: 'Profile not found' };
  }

  let browser;
  const results = [];

  try {
    // Launch Zotero with Playwright
    browser = await chromium.launch({
      headless: headless,
      executablePath: ZOTERO_PATH,
      args: [
        '-P',
        PROFILE_PATH,
        '--no-remote'
      ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Wait for Zotero to load and extension to initialize
    console.log('Waiting for Zotero and extension to load...');
    await page.waitForTimeout(5000);

    // Check if Zotero is loaded
    const zoteroLoaded = await page.evaluate(() => {
      return typeof Zotero !== 'undefined';
    });

    if (!zoteroLoaded) {
      throw new Error('Zotero not loaded in browser context');
    }

    console.log('Zotero loaded, running tests...\n');

    // Run each test
    for (const testName of Object.keys(TEST_DEFINITIONS)) {
      console.log(`Running: ${testName}...`);
      const result = await runTest(page, testName);
      results.push(result);

      const status = result.success ? '✓ PASS' : '✗ FAIL';
      console.log(`  ${status}: ${result.name}`);
      if (result.message) {
        console.log(`         ${result.message}`);
      }
      if (result.error) {
        console.log(`         Error: ${result.error}`);
      }
    }

    await context.close();
  } catch (e) {
    console.error('Test error:', e.message);
    results.push({ name: 'Test Runner', success: false, error: e.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('');
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  return { passed, failed, total: results.length, results };
}

/**
 * Interactive mode
 */
async function watchMode() {
  console.log('Watch mode - press Ctrl+C to exit');
  let iteration = 0;

  while (true) {
    iteration++;
    console.log(`\n--- Iteration ${iteration} ---`);

    try {
      const { passed, failed } = await runAllTests({ headless: false });
      if (failed > 0) {
        console.log(`\nSome tests failed. Waiting 10 seconds before re-running...`);
        await new Promise(r => setTimeout(r, 10000));
      } else {
        console.log(`\nAll tests passed! Waiting 30 seconds...`);
        await new Promise(r => setTimeout(r, 30000));
      }
    } catch (e) {
      console.error('Error:', e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    watch: args.includes('--watch') || args.includes('-w'),
    headless: !args.includes('--no-headless')
  };

  if (options.watch) {
    watchMode().catch(console.error);
  } else {
    runAllTests(options)
      .then(({ passed, failed }) => {
        process.exit(failed > 0 ? 1 : 0);
      })
      .catch(e => {
        console.error('Fatal error:', e);
        process.exit(1);
      });
  }
}

module.exports = {
  runAllTests,
  runTest,
  TEST_DEFINITIONS
};
