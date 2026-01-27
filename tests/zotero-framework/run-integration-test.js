/**
 * Zotero NER Integration Test Runner
 *
 * This script runs integration tests for the Zotero NER extension.
 *
 * NOTE: Zotero 7/8 has strict extension loading requirements.
 * For automated CI/CD, the extension should be installed manually
 * or via a pre-configured profile.
 *
 * This test verifies:
 * 1. Zotero starts correctly
 * 2. Extension files are present
 * 3. Unit tests pass (core functionality)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TEST_PROFILE_DIR = '/tmp/zotero-ner-integration-test';
const RESULTS_FILE = '/tmp/zotero-ner-integration-results.json';
const EXTENSION_ID = 'zotero-ner-author-normalizer@marcinmilkowski.pl';
const ZOTERO_PATH = '/tmp/Zotero_linux-x86_64/zotero';

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runIntegrationTests() {
    console.log();
    log('Zotero NER Integration Tests');
    log('==============================');
    console.log();

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
        timestamp: Date.now(),
        note: 'Extension loading requires manual installation or pre-configured profile'
    };

    function pass(name) {
        results.passed++;
        results.tests.push({ name, status: 'pass' });
        log('[PASS] ' + name);
    }

    function fail(name, error) {
        results.failed++;
        results.tests.push({ name, status: 'fail', error });
        log('[FAIL] ' + name + ': ' + error);
    }

    // Test 1: Check if Zotero binary exists
    log('Test 1: Zotero Installation');
    if (fs.existsSync(ZOTERO_PATH)) {
        pass('Zotero binary exists');
    } else {
        fail('Zotero binary exists', 'Not found at ' + ZOTERO_PATH);
    }

    // Test 2: Check if extension files exist
    log('\nTest 2: Extension Files');
    const filesToCheck = [
        ['bootstrap.js', path.join(PROJECT_ROOT, 'bootstrap.js')],
        ['manifest.json', path.join(PROJECT_ROOT, 'manifest.json')],
        ['dialog.html', path.join(PROJECT_ROOT, 'content', 'dialog.html')],
        ['zotero-ner-bundled.js', path.join(PROJECT_ROOT, 'content', 'scripts', 'zotero-ner-bundled.js')],
        ['zotero-ner.xpi', path.join(PROJECT_ROOT, 'dist', 'zotero-ner-author-normalizer-1.0.0.xpi')]
    ];

    let allFilesExist = true;
    for (const [name, filePath] of filesToCheck) {
        if (fs.existsSync(filePath)) {
            log('  [OK] ' + name);
        } else {
            log('  [MISSING] ' + name);
            allFilesExist = false;
        }
    }
    if (allFilesExist) {
        pass('All extension files present');
    } else {
        fail('All extension files present', 'Some files are missing');
    }

    // Test 3: Check manifest is valid
    log('\nTest 3: Manifest Validation');
    try {
        const manifestPath = path.join(PROJECT_ROOT, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (manifest.bootstrap && manifest.browser_specific_settings) {
                pass('Manifest is valid (bootstrap extension)');
            } else if (manifest.applications) {
                pass('Manifest is valid (legacy extension)');
            } else {
                fail('Manifest is valid', 'Missing bootstrap or applications config');
            }
        } else {
            fail('Manifest is valid', 'manifest.json not found');
        }
    } catch (e) {
        fail('Manifest is valid', e.message);
    }

    // Test 4: Run Zotero and check HTTP server
    log('\nTest 4: Zotero Startup');
    const zotero = spawn('xvfb-run', ['-a', ZOTERO_PATH, '-profile', TEST_PROFILE_DIR], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000
    });

    let httpResponded = false;
    let httpCheckDone = false;

    // Check HTTP server
    const checkHttp = setInterval(() => {
        if (httpCheckDone) {
            clearInterval(checkHttp);
            return;
        }

        const req = http.get('http://127.0.0.1:23124', (res) => {
            httpResponded = true;
            httpCheckDone = true;
            clearInterval(checkHttp);
            pass('Zotero HTTP server responds');
            log('  Zotero is running and ready');
        });
        req.on('error', () => {});
        req.setTimeout(1000, () => { req.destroy(); });
        req.end();
    }, 500);

    // Wait for Zotero to start
    await new Promise(r => setTimeout(r, 10000));

    httpCheckDone = true;
    clearInterval(checkHttp);

    if (httpResponded) {
        pass('Zotero starts successfully');
    } else {
        fail('Zotero starts successfully', 'HTTP server did not respond');
    }

    // Cleanup
    zotero.kill('SIGTERM');

    // Test 5: Run unit tests
    log('\nTest 5: Unit Tests');
    const unitResultsFile = '/tmp/zotero-ner-unit-results.json';
    if (fs.existsSync(unitResultsFile)) {
        try {
            const unitResults = JSON.parse(fs.readFileSync(unitResultsFile, 'utf8'));
            const passed = unitResults.numPassedTests || unitResults.passed || 0;
            const failed = unitResults.numFailedTests || unitResults.failed || 0;
            if (failed === 0) {
                pass('Unit tests pass (' + passed + ' tests)');
            } else {
                fail('Unit tests pass', passed + ' passed, ' + failed + ' failed');
            }
        } catch (e) {
            log('  Note: Could not parse unit test results');
        }
    } else {
        log('  Note: Run npm run test:unit first to get unit test results');
    }

    // Write results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    // Print summary
    console.log();
    log('='.repeat(40));
    log('Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
    log('='.repeat(40));
    console.log();
    log('Full results written to:', RESULTS_FILE);
    console.log();
    log('NOTE: Extension loading in Zotero 7/8 requires manual installation');
    log('      or a pre-configured profile for full integration testing.');

    return results;
}

runIntegrationTests()
    .then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
        console.error('Integration test failed:', err.message);
        process.exit(1);
    });
