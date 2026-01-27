/**
 * Zotero Integration Test Runner
 *
 * Runs tests within Zotero's actual JavaScript context.
 * Uses Zotero's -js flag to execute code and captures output via dump().
 *
 * Usage: node tests/zotero-integration/run-tests.js [--watch]
 *
 * Note: Uses your default Zotero profile which must have the extension installed.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const EXTENSION_PATH = path.join(PROJECT_ROOT, 'content');
const BUILD_PATH = path.join(PROJECT_ROOT, 'content', 'scripts', 'zotero-ner-bundled.js');

// Output file for test results
const OUTPUT_FILE = path.join(__dirname, 'test-output.json');

// Zotero paths
const ZOTERO_PATH = process.env.ZOTERO_PATH || '/Applications/Zotero.app/Contents/MacOS/zotero';

// Default Zotero profile (must have extension installed)
// Uses first profile found in profiles.ini or falls back to a known profile
function findZoteroProfile() {
  // Check environment variable first
  if (process.env.ZOTERO_PROFILE) {
    return process.env.ZOTERO_PROFILE;
  }

  // Try to find profiles.ini
  const appSupportPath = path.join(os.homedir(), 'Library', 'Application Support', 'Zotero');
  const profilesIniPath = path.join(appSupportPath, 'profiles.ini');

  if (fs.existsSync(profilesIniPath)) {
    const content = fs.readFileSync(profilesIniPath, 'utf8');
    const match = content.match(/Default=Profiles\/(\w+)/);
    if (match) {
      return path.join(appSupportPath, 'Profiles', match[1]);
    }
  }

  // Fallback to known profile (update this if your profile path is different)
  const knownProfile = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Zotero',
    'Profiles',
    'ugqxjkh5.default'
  );

  if (fs.existsSync(knownProfile)) {
    return knownProfile;
  }

  // Return our test profile as last resort
  return path.join(__dirname, 'profile');
}

const PROFILE_PATH = findZoteroProfile();

// Test output markers
const MARKERS = {
  TEST_START: '=== ZOTERO_NER_TEST_START ===',
  TEST_RESULT: '=== ZOTERO_NER_TEST_RESULT:',
  TEST_COMPLETE: '=== ZOTERO_NER_TEST_COMPLETE:',
  TEST_ERROR: '=== ZOTERO_NER_TEST_ERROR:',
  DUMP: '=== ZOTERO_NER_DUMP:',
};

/**
 * Test definitions - code that runs in Zotero context
 */
const TEST_DEFINITIONS = {
  /**
   * Test that Zotero and the extension are loaded
   */
  testZoteroLoaded: {
    name: 'Zotero Loaded',
    code: `
      try {
        if (typeof Zotero === 'undefined') {
          throw new Error('Zotero is not defined');
        }
        dump('${MARKERS.DUMP}' + JSON.stringify({Zotero_version: Zotero.version}) + '\\n');
        return { success: true, message: 'Zotero is loaded' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  },

  /**
   * Test that the extension is initialized
   */
  testExtensionLoaded: {
    name: 'Extension Loaded',
    code: `
      try {
        const loaded = typeof Zotero !== 'undefined' && Zotero.NER;
        if (!loaded) {
          throw new Error('Zotero.NER is not defined');
        }
        dump('${MARKERS.DUMP}' + JSON.stringify({initialized: Zotero.NER.initialized}) + '\\n');
        return { success: true, message: 'Extension is loaded' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  },

  /**
   * Test the learning engine
   */
  testLearningEngine: {
    name: 'Learning Engine',
    code: `
      try {
        if (!Zotero.NER.learningEngine) {
          throw new Error('Learning engine not initialized');
        }
        // Test storing and retrieving a mapping
        Zotero.NER.learningEngine.storeMapping('Smyth', 'Smith', 0.9);
        const mappings = Zotero.NER.learningEngine.getMapping('Smyth');
        const success = mappings && mappings.normalized === 'Smith';
        return {
          success: success,
          message: success ? 'Learning engine working' : 'Mapping not found',
          mappings: mappings
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  },

  /**
   * Test the name parser
   */
  testNameParser: {
    name: 'Name Parser',
    code: `
      try {
        if (!Zotero.NER.nameParser) {
          throw new Error('Name parser not initialized');
        }
        const testCases = [
          { input: 'John Smith', expected: { firstName: 'John', lastName: 'Smith' } },
          { input: 'J. Smith', expected: { firstName: 'J.', lastName: 'Smith' } },
          { input: 'van der Berg', expected: { firstName: '', lastName: 'van der Berg' } }
        ];
        const results = testCases.map(tc => {
          const parsed = Zotero.NER.nameParser.parse(tc.input);
          return {
            input: tc.input,
            parsed: parsed,
            matches: parsed.lastName === tc.expected.lastName
          };
        });
        const allPassed = results.every(r => r.matches);
        dump('${MARKERS.DUMP}' + JSON.stringify({results: results}) + '\\n');
        return { success: allPassed, results: results };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  },

  /**
   * Test the candidate finder
   */
  testCandidateFinder: {
    name: 'Candidate Finder',
    code: `
      try {
        if (!Zotero.NER.candidateFinder) {
          throw new Error('Candidate finder not initialized');
        }
        const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
        const candidates = Zotero.NER.candidateFinder.findPotentialVariants(surnames);
        dump('${MARKERS.DUMP}' + JSON.stringify({candidates: candidates}) + '\\n');
        return {
          success: candidates && candidates.length > 0,
          candidateCount: candidates ? candidates.length : 0,
          candidates: candidates
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  },

  /**
   * Test database analyzer initialization
   */
  testDBAnalyzer: {
    name: 'DB Analyzer',
    code: `
      try {
        if (!Zotero.NER.menuIntegration) {
          throw new Error('Menu integration not initialized');
        }
        const dbAnalyzer = Zotero.NER.menuIntegration.zoteroDBAnalyzer;
        if (!dbAnalyzer) {
          throw new Error('DB analyzer not available');
        }
        dump('${MARKERS.DUMP}' + JSON.stringify({hasAnalyzer: true}) + '\\n');
        return { success: true, hasDBAnalyzer: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  },

  /**
   * Test library access (requires actual library)
   */
  testLibraryAccess: {
    name: 'Library Access',
    code: `
      try {
        if (typeof Zotero === 'undefined' || !Zotero.Libraries) {
          return { success: false, error: 'Zotero Libraries not available' };
        }
        const userLibraryID = Zotero.Libraries.userLibraryID;
        const hasAccess = typeof userLibraryID === 'number';
        dump('${MARKERS.DUMP}' + JSON.stringify({libraryID: userLibraryID}) + '\\n');
        return {
          success: hasAccess,
          libraryID: userLibraryID,
          message: hasAccess ? 'Library access confirmed' : 'No library access'
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `
  }
};

/**
 * Parse test output from Zotero's stdout
 */
function parseTestOutput(output) {
  const results = [];
  const lines = output.split('\n');
  let currentTest = null;

  for (const line of lines) {
    if (line.startsWith(MARKERS.TEST_RESULT)) {
      try {
        const data = JSON.parse(line.substring(MARKERS.TEST_RESULT.length).trim());
        if (currentTest) {
          currentTest.result = data;
          results.push(currentTest);
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else if (line.startsWith(MARKERS.TEST_COMPLETE)) {
      try {
        const data = JSON.parse(line.substring(MARKERS.TEST_COMPLETE.length).trim());
        results.push({ name: 'Complete', result: data });
      } catch (e) {}
    } else if (line.startsWith(MARKERS.TEST_ERROR)) {
      try {
        const data = JSON.parse(line.substring(MARKERS.TEST_ERROR.length).trim());
        if (currentTest) {
          currentTest.result = { success: false, error: data.message };
          results.push(currentTest);
        }
      } catch (e) {}
    } else if (line.startsWith(MARKERS.TEST_START)) {
      const testName = line.substring(MARKERS.TEST_START.length).trim();
      currentTest = { name: testName, result: null };
    } else if (line.startsWith(MARKERS.DUMP)) {
      try {
        const data = JSON.parse(line.substring(MARKERS.DUMP.length).trim());
        if (currentTest && currentTest.result) {
          currentTest.result.debug = data;
        }
      } catch (e) {}
    }
  }

  return results;
}

/**
 * Generate test code that runs all tests
 */
function generateTestCode(testNames, outputFile) {
  const testsToRun = testNames
    .map(name => TEST_DEFINITIONS[name])
    .filter(Boolean);

  // Create test functions as strings
  const testFuncs = testsToRun.map((t, idx) => `
    var testFn${idx} = function() {
      ${t.code}
    };
  `).join('\n');

  const testCalls = testsToRun.map((t, idx) => `
    try {
      var result = testFn${idx}();
      writeToFile('${MARKERS.TEST_RESULT}' + JSON.stringify(result) + '\\n');
    } catch (e) {
      writeToFile('${MARKERS.TEST_ERROR}' + JSON.stringify({message: e.message, stack: e.stack}) + '\\n');
    }
  `).join('\n');

  return `
    (function() {
      // Helper to write results to file
      var filePath = '${outputFile}';
      var writeToFile = function(text) {
        try {
          var file = Components.classes['@mozilla.org/file/local;1']
            .createInstance(Components.interfaces.nsILocalFile);
          file.initWithPath(filePath);
          var stream = Components.classes['@mozilla.org/network/file-output-stream;1']
            .createInstance(Components.interfaces.nsIFileOutputStream);
          stream.init(file, 0x02 | 0x08 | 0x20, 0o644, 0);
          stream.write(text, text.length);
          stream.close();
        } catch (e) {
          dump('Write error: ' + e.message + '\\n');
        }
      };

      writeToFile('${MARKERS.TEST_START}Initialization\\n');

      ${testFuncs}

      ${testCalls}

      writeToFile('${MARKERS.TEST_COMPLETE}' + JSON.stringify({count: ${testsToRun.length}}) + '\\n');
    })();
  `;
}

/**
 * Run Zotero with test code
 */
function runZoteroTest(testNames, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeout = 60000, debug = false } = options;

    // Use a unique output file for each test run
    const outputFile = OUTPUT_FILE + '.' + Date.now() + '.tmp';

    const testCode = generateTestCode(testNames, outputFile);
    const profileDir = PROFILE_PATH;

    // Ensure profile directory exists
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Build command args
    const args = [
      '-profile', profileDir,
      '-js', testCode
    ];

    if (debug) {
      console.log('Running Zotero with args:', args);
      console.log('Output file:', outputFile);
    }

    const proc = spawn(ZOTERO_PATH, args, {
      cwd: path.dirname(ZOTERO_PATH),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (debug) process.stdout.write(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (debug) process.stderr.write(text);
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (debug) {
        console.log('Zotero exited with code:', code);
      }

      // Read results from output file
      let output = '';
      if (fs.existsSync(outputFile)) {
        try {
          output = fs.readFileSync(outputFile, 'utf8');
        } catch (e) {
          if (debug) console.error('Error reading output file:', e.message);
        }
      }

      if (code !== 0 && code !== 143) {
        if (code !== 143) {
          console.error('Zotero exited with code:', code);
        }
      }

      // Clean up temp file
      try {
        if (fs.existsSync(outputFile)) {
          fs.unlinkSync(outputFile);
        }
      } catch (e) {}

      resolve({ stdout: output, stderr, code });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Run a single test and return result
 */
async function runTest(testName) {
  console.log(`\nRunning: ${testName}`);

  try {
    const { stdout } = await runZoteroTest([testName], { timeout: 15000 });
    const results = parseTestOutput(stdout);

    if (results.length === 0) {
      return { name: testName, success: false, error: 'No output' };
    }

    // Find the test result
    const testResult = results.find(r => r.name === testName || r.result);
    if (!testResult) {
      return { name: testName, success: false, error: 'Test not found in output', raw: stdout };
    }

    return {
      name: testName,
      ...(testResult.result || {})
    };
  } catch (e) {
    return { name: testName, success: false, error: e.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests(options = {}) {
  const { debug = false, filter = null } = options;

  console.log('='.repeat(60));
  console.log('Zotero NER Integration Tests');
  console.log('='.repeat(60));
  console.log(`Zotero: ${ZOTERO_PATH}`);
  console.log(`Profile: ${PROFILE_PATH}`);
  console.log(`Extension: ${EXTENSION_PATH}`);
  console.log('');

  const testNames = (filter && filter.length > 0) ? filter : Object.keys(TEST_DEFINITIONS);

  if (debug) {
    console.log('Tests to run:', testNames);
  }

  const results = [];

  for (const testName of testNames) {
    console.log(`\nRunning: ${testName}...`);

    try {
      const { stdout } = await runZoteroTest([testName], { timeout: 30000, debug });

      if (debug) {
        console.log('Raw stdout length:', stdout.length);
        console.log('First 500 chars of stdout:', stdout.substring(0, 500));
      }

      const testResults = parseTestOutput(stdout);

      if (debug) {
        console.log('Parsed results:', testResults.length);
      }

      // Find the test result
      const testResult = testResults.find(r => {
        const name = r.name || '';
        const def = TEST_DEFINITIONS[testName];
        return name === def?.name || r.result;
      });

      if (!testResult && testResults.length > 0) {
        // Use the first result if no matching test found
        results.push({ name: testName, ...(testResults[0].result || {}) });
      } else if (testResult) {
        results.push({ name: testName, ...(testResult.result || {}) });
      } else {
        results.push({ name: testName, success: false, error: 'No output' });
      }
    } catch (e) {
      results.push({ name: testName, success: false, error: e.message });
    }

    const result = results[results.length - 1];
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}: ${result.name}`);
    if (result.message) {
      console.log(`         ${result.message}`);
    }
    if (result.error) {
      console.log(`         Error: ${result.error}`);
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
 * Interactive mode - run tests continuously
 */
async function watchMode() {
  console.log('Watch mode - press Ctrl+C to exit');
  let iteration = 0;

  while (true) {
    iteration++;
    console.log(`\n--- Iteration ${iteration} ---`);

    try {
      const { passed, failed } = await runAllTests();
      if (failed > 0) {
        console.log(`\nSome tests failed. Waiting 5 seconds before re-running...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.log(`\nAll tests passed! Waiting 10 seconds...`);
        await new Promise(r => setTimeout(r, 10000));
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
    debug: args.includes('--debug'),
    filter: args.filter(a => a !== '--watch' && a !== '--debug' && a !== '-w' && a !== '-d')
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
  runZoteroTest,
  TEST_DEFINITIONS
};
