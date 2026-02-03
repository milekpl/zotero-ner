#!/usr/bin/env node
/**
 * Zotero Name Normalizer Extension Test Automation
 *
 * Uses Zotero's startup script capability to run tests.
 * This approach actually loads the extension and runs tests in a real Zotero session.
 *
 * Usage: node tests/automation/run-tests.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ZOTERO_PATH = '/Applications/Zotero.app/Contents/MacOS/zotero';
const TEST_PROFILE_DIR = path.join(PROJECT_ROOT, 'tests', 'automation', 'test-profile');
const RESULTS_FILE = path.join(PROJECT_ROOT, 'tests', 'automation', 'test-results.json');

// Find the built XPI file
function findXPI() {
  const distDir = path.join(PROJECT_ROOT, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ directory not found. Run "npm run build" first.');
  }
  const files = fs.readdirSync(distDir);
  const xpiFile = files.find(f => f.endsWith('.xpi') && f.includes('zotero-ner'));
  if (!xpiFile) {
    throw new Error('No Zotero Name Normalizer XPI found in dist/. Run "npm run build" first.');
  }
  return path.join(distDir, xpiFile);
}

// The test script that runs in Zotero
function createTestScript() {
  return `
// Zotero Name Normalizer Test Script - runs at Zotero startup
// Tests the extension and writes results to file

(function() {
  function log(msg) {
    dump('NER_TEST: ' + msg + '\\n');
  }

  log('Test script starting...');

  // Wait a bit for extension to fully load
  setTimeout(function() {
    try {
      log('Checking Zotero.NameNormalizer...');
      if (typeof Zotero === 'undefined' || !Zotero.NameNormalizer) {
        log('ERROR: Zotero or Zotero.NameNormalizer not available');
        writeResults({ error: 'Zotero.NameNormalizer not available' });
        Zotero.quit();
        return;
      }

      log('Running tests...');
      const results = ZoteroNERTests.runAllTests();
      log('Tests completed: ' + results.passed + '/' + results.total + ' passed');
      writeResults(results);

      // Give time for file write then quit
      setTimeout(function() {
        Zotero.quit();
      }, 500);
    } catch (e) {
      log('ERROR: ' + e.message + '\\n' + e.stack);
      writeResults({ error: e.message, stack: e.stack });
      setTimeout(function() {
        Zotero.quit();
      }, 500);
    }
  }, 2000);  // Wait 2 seconds for extension to load

  function writeResults(data) {
    try {
      const file = Components.classes['@mozilla.org/file/local;1']
        .createInstance(Components.interfaces.nsIFile);
      file.initWithPath('${RESULTS_FILE.replace(/\\/g, '\\\\')}');
      const stream = Components.classes['@mozilla.org/network/file-output-stream;1']
        .createInstance(Components.interfaces.nsIFileOutputStream);
      stream.init(file, -1, -1, 0);
      const json = JSON.stringify(data, null, 2);
      stream.write(json, json.length);
      stream.close();
      log('Results written to file');
    } catch (e) {
      log('Failed to write results: ' + e.message);
    }
  }
})();
`;
}

function log(msg) {
  console.log('[TEST-AUTO] ' + msg);
}

function createTestProfile() {
  log('Creating test profile...');

  // Clean up existing
  if (fs.existsSync(TEST_PROFILE_DIR)) {
    log('Removing existing test profile...');
    fs.rmSync(TEST_PROFILE_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_PROFILE_DIR, 'extensions'), { recursive: true });

  const extXpi = findXPI();
  const extId = 'zotero-ner@milkowski.dev';
  const extPath = path.join(TEST_PROFILE_DIR, 'extensions', extId + '.xpi');

  fs.copyFileSync(extXpi, extPath);
  log('Installed extension: ' + path.basename(extXpi));

  // Create prefs.js with startup script
  const testScriptPath = path.join(TEST_PROFILE_DIR, 'test-script.js');
  fs.writeFileSync(testScriptPath, createTestScript());

  const prefsContent = `
// Zotero Name Normalizer Test Profile
user_pref("extensions.zotero.debug.logging", true);
user_pref("extensions.zotero.debug.console", true);
user_pref("javascript.options.showInConsole", true);
user_pref("browser.dom.window.dump.enabled", true);

// Run test script at startup
user_pref("extensions.zotero.scriptFile", "chrome://zotero/content/test-script.js");
`;
  fs.writeFileSync(path.join(TEST_PROFILE_DIR, 'prefs.js'), prefsContent);
  fs.copyFileSync(testScriptPath, path.join(TEST_PROFILE_DIR, 'test-script.js'));

  log('Created prefs.js with test script');
  return TEST_PROFILE_DIR;
}

function runZoteroTests(profilePath) {
  return new Promise((resolve, reject) => {
    log('Launching Zotero...');

    const proc = spawn(ZOTERO_PATH, ['-profile', profilePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on('error', (err) => {
      log('Failed to start Zotero: ' + err.message);
      reject(err);
    });

    // Check periodically if results file exists
    const checkInterval = setInterval(() => {
      if (fs.existsSync(RESULTS_FILE)) {
        log('Results file detected!');
        clearInterval(checkInterval);
        // Give a moment for file to be fully written
        setTimeout(() => {
          resolve();
        }, 500);
      }
    }, 500);

    // Timeout after 45 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      log('Test timeout - killing process');
      proc.kill('SIGKILL');
      reject(new Error('Test timeout'));
    }, 45000);

    proc.on('close', (code) => {
      clearInterval(checkInterval);
      if (code !== 0 && code !== null) {
        log('Zotero exited with code: ' + code);
      }
    });
  });
}

function readResults() {
  if (fs.existsSync(RESULTS_FILE)) {
    const content = fs.readFileSync(RESULTS_FILE, 'utf8');
    return JSON.parse(content);
  }
  return null;
}

function formatResults(results) {
  if (!results) {
    return { error: 'No results file found' };
  }

  const lines = [];
  lines.push('='.repeat(50));
  lines.push('Zotero Name Normalizer Test Results');
  lines.push('='.repeat(50));

  if (results.timestamp) {
    lines.push('Timestamp: ' + results.timestamp);
  }

  if (results.error) {
    lines.push('ERROR: ' + results.error);
    if (results.stack) {
      lines.push('Stack: ' + results.stack);
    }
    return { passed: 0, failed: 0, total: 0, formatted: lines.join('\n') };
  }

  lines.push('');

  if (results.tests) {
    for (const [name, result] of Object.entries(results.tests)) {
      const status = result.success ? '✓ PASS' : '✗ FAIL';
      lines.push(status + ' ' + name);
      if (result.error) {
        lines.push('       Error: ' + result.error);
      }
      if (result.message) {
        lines.push('       ' + result.message);
      }
    }
  }

  lines.push('');
  lines.push('='.repeat(50));
  lines.push(`Summary: ${results.passed}/${results.total} passed`);
  lines.push('='.repeat(50));

  return {
    passed: results.passed || 0,
    failed: results.failed || 0,
    total: results.total || 0,
    details: results.tests || {},
    formatted: lines.join('\n')
  };
}

async function main() {
  console.log('');
  log('Zotero Name Normalizer Extension Test Automation');
  log('====================================');
  console.log('');

  try {
    // Step 1: Build extension
    log('Step 1: Building extension...');
    try {
      execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'pipe' });
      log('Build complete');
    } catch (e) {
      log('Build failed (may already be up to date)');
    }

    // Step 2: Create test profile with extension
    log('Step 2: Setting up test profile...');
    const profilePath = createTestProfile();
    log('Profile created at: ' + profilePath);

    // Step 3: Run tests
    log('Step 3: Running tests (Zotero will auto-quit when done)...');
    await runZoteroTests(profilePath);

    // Step 4: Read results
    log('Step 4: Reading results...');
    const rawResults = readResults();

    if (!rawResults) {
      log('ERROR: No results file generated');
      process.exit(1);
    }

    const formatted = formatResults(rawResults);
    console.log('');
    console.log(formatted.formatted);

    // Write formatted results
    fs.writeFileSync(RESULTS_FILE.replace('.json', '-formatted.txt'), formatted.formatted);

    // Exit with appropriate code
    const exitCode = formatted.failed > 0 ? 1 : 0;
    log('Tests complete. Exit code: ' + exitCode);
    process.exit(exitCode);

  } catch (err) {
    log('ERROR: ' + err.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure Zotero is installed at: ' + ZOTERO_PATH);
    console.log('2. Run "npm run build" first to create the extension');
    console.log('3. Or run tests manually: ZoteroNERTests.runAllTests() in browser console');
    process.exit(1);
  }
}

main();
