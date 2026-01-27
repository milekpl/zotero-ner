/**
 * Simple Zotero test runner
 *
 * Creates a test that writes results to a file.
 * Run with: npm run test:zotero
 *
 * Note: This script starts Zotero and waits for it to write test results.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const ZOTERO_PATH = process.env.ZOTERO_PATH || '/Applications/Zotero.app/Contents/MacOS/zotero';
const PROFILE_PATH = process.env.ZOTERO_PROFILE || path.join(os.homedir(), 'Library', 'Application Support', 'Zotero', 'Profiles', 'ugqxjkh5.default');
const OUTPUT_FILE = '/tmp/zotero-ner-test-results.json';
const TEST_FILE = '/tmp/zotero-ner-test-runner.js';

// Test code to run in Zotero
const TEST_CODE = `
// Zotero NER Test Runner
// This file is loaded and executed by Zotero

var results = {
  timestamp: new Date().toISOString(),
  tests: []
};

function runTest(name, testFn) {
  try {
    var result = testFn();
    results.tests.push({ name: name, success: result.success, error: result.error });
  } catch (e) {
    results.tests.push({ name: name, success: false, error: e.message });
  }
}

// Test 1: Zotero loaded
runTest('testZoteroLoaded', function() {
  if (typeof Zotero === 'undefined') {
    return { success: false, error: 'Zotero not defined' };
  }
  return { success: true, version: Zotero.version };
});

// Test 2: Extension loaded
runTest('testExtensionLoaded', function() {
  if (typeof Zotero === 'undefined' || !Zotero.NER) {
    return { success: false, error: 'Zotero.NER not defined' };
  }
  return { success: true, initialized: Zotero.NER.initialized };
});

// Test 3: Learning engine
runTest('testLearningEngine', function() {
  if (!Zotero.NER.learningEngine) {
    return { success: false, error: 'Learning engine not initialized' };
  }
  Zotero.NER.learningEngine.storeMapping('Smyth', 'Smith', 0.9);
  var mappings = Zotero.NER.learningEngine.getMapping('Smyth');
  return { success: mappings && mappings.normalized === 'Smith', mappings: mappings };
});

// Test 4: Name parser
runTest('testNameParser', function() {
  if (!Zotero.NER.nameParser) {
    return { success: false, error: 'Name parser not initialized' };
  }
  var parsed = Zotero.NER.nameParser.parse('John Smith');
  return { success: parsed.lastName === 'Smith', parsed: parsed };
});

// Write results to file
var file = Components.classes['@mozilla.org/file/local;1']
  .createInstance(Components.interfaces.nsILocalFile);
file.initWithPath('${OUTPUT_FILE}');
var stream = Components.classes['@mozilla.org/network/file-output-stream;1']
  .createInstance(Components.interfaces.nsIFileOutputStream);
stream.init(file, 0x02 | 0x08 | 0x20, 0o644, 0);
stream.write(JSON.stringify(results), JSON.stringify(results).length);
stream.close();

// Exit Zotero
Zotero.quit();
`;

// Create test file
fs.writeFileSync(TEST_FILE, TEST_CODE.replace('${OUTPUT_FILE}', OUTPUT_FILE));

console.log('='.repeat(60));
console.log('Zotero NER Integration Tests');
console.log('='.repeat(60));
console.log(`Zotero: ${ZOTERO_PATH}`);
console.log(`Profile: ${PROFILE_PATH}`);
console.log('');

// Remove old output file
if (fs.existsSync(OUTPUT_FILE)) {
  fs.unlinkSync(OUTPUT_FILE);
}

// Start Zotero with test
const proc = spawn(ZOTERO_PATH, [
  '-P', PROFILE_PATH,
  '-js', TEST_FILE
], {
  cwd: path.dirname(ZOTERO_PATH),
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

proc.stdout.on('data', (data) => {
  stdout += data.toString();
});

proc.stderr.on('data', (data) => {
  stderr += data.toString();
});

// Wait for test to complete (either output file created or timeout)
let completed = false;
const timeout = setTimeout(() => {
  if (!completed) {
    proc.kill('SIGTERM');
    console.log('Test timed out after 30 seconds');
    process.exit(1);
  }
}, 30000);

proc.on('close', (code) => {
  completed = true;
  clearTimeout(timeout);

  if (code !== 0 && code !== 143) {
    console.log('Zotero exited with code:', code);
  }
});

// Check for results
const checkResults = setInterval(() => {
  if (completed) {
    clearInterval(checkResults);
    return;
  }

  if (fs.existsSync(OUTPUT_FILE)) {
    clearInterval(checkResults);
    completed = true;
    proc.kill('SIGTERM');

    try {
      const results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      console.log('\\nTest Results:');
      console.log('-'.repeat(40));

      let passed = 0;
      let failed = 0;

      for (const test of results.tests) {
        const status = test.success ? '✓ PASS' : '✗ FAIL';
        console.log(\`  \${status}: \${test.name}\`);
        if (test.error) {
          console.log(\`         Error: \${test.error}\`);
        }
        if (test.success) passed++;
        else failed++;
      }

      console.log('');
      console.log('='.repeat(60));
      console.log(\`Results: \${passed} passed, \${failed} failed\`);
      console.log('='.repeat(60));

      // Cleanup
      try {
        fs.unlinkSync(TEST_FILE);
        fs.unlinkSync(OUTPUT_FILE);
      } catch (e) {}

      process.exit(failed > 0 ? 1 : 0);
    } catch (e) {
      console.error('Error reading results:', e.message);
      process.exit(1);
    }
  }
}, 500);
