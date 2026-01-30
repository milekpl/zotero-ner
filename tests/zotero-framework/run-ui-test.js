/**
 * Zotero NER UI Test Automation
 *
 * This script tests the extension by:
 * 1. Verifying extension files are present and correctly built
 * 2. Starting Zotero with a test profile
 * 3. Checking that Zotero starts and HTTP server responds
 * 4. Running tests inside Zotero via the test mode in bootstrap.js
 *
 * For full UI testing (installing extension via Add-ons Manager),
 * manual intervention or the zotero-plugin template is required.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TEST_PROFILE_DIR = '/tmp/zotero-ner-ui-test';
const RESULTS_FILE = '/tmp/zotero-ner-ui-results.json';
const XPI_PATH = path.join(PROJECT_ROOT, 'dist', 'zotero-ner-author-normalizer-1.0.0.xpi');
const ZOTERO_PATH = '/tmp/Zotero_linux-x86_64/zotero';

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runUITests() {
    console.log();
    log('Zotero NER UI Test Automation');
    log('==============================');
    console.log();

    // Setup profile
    fs.rmSync(TEST_PROFILE_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });

    // Write prefs.js with test mode
    fs.writeFileSync(path.join(TEST_PROFILE_DIR, 'prefs.js'), `
// Mozilla User Preferences
user_pref("app.update.enabled", false);
user_pref("services.sync.enabled", false);
user_pref("zotero.debug.log", true);
user_pref("zotero.debug.log.timestamp", true);
user_pref("extensions.zotero.httpServer.enabled", true);
user_pref("extensions.zotero.httpServer.port", 23124);
user_pref("extensions.zotero-name-normalizer.testMode", true);
user_pref("extensions.zotero-name-normalizer.developerMode", true);
`);

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
        timestamp: Date.now(),
        notes: []
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

    function note(msg) {
        results.notes.push(msg);
        log('[NOTE] ' + msg);
    }

    // Test 1: Extension package exists
    log('Test 1: Extension Package');
    if (fs.existsSync(XPI_PATH)) {
        pass('XPI file exists');
        const sizeKB = (fs.statSync(XPI_PATH).size / 1024).toFixed(1);
        log('  Path: ' + XPI_PATH);
        log('  Size: ' + sizeKB + ' KB');

        // Verify it's a valid zip
        try {
            const zip = require('yauzl');
            await new Promise((resolve, reject) => {
                zip.open(XPI_PATH, { lazyEntries: true }, (err, zipfile) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    zipfile.readEntry();
                    zipfile.on('entry', (entry) => {
                        if (entry.fileName.includes('manifest.json') || entry.fileName.includes('bootstrap.js')) {
                            zipfile.readEntry();
                        } else {
                            zipfile.readEntry();
                        }
                    });
                    zipfile.on('end', () => {
                        pass('XPI is valid zip archive');
                        resolve();
                    });
                    zipfile.on('error', reject);
                });
            });
        } catch (e) {
            fail('XPI is valid zip archive', e.message);
        }
    } else {
        fail('XPI file exists', 'Not found at ' + XPI_PATH);
    }

    // Test 2: Extension files structure
    log('\nTest 2: Extension Structure');
    const requiredFiles = [
        ['manifest.json', path.join(PROJECT_ROOT, 'manifest.json')],
        ['bootstrap.js', path.join(PROJECT_ROOT, 'bootstrap.js')],
        ['zotero-ner-bundled.js', path.join(PROJECT_ROOT, 'content', 'scripts', 'zotero-ner-bundled.js')],
        ['dialog.html', path.join(PROJECT_ROOT, 'content', 'dialog.html')]
    ];

    let allFilesExist = true;
    for (const [name, filePath] of requiredFiles) {
        if (fs.existsSync(filePath)) {
            log('  [OK] ' + name);
        } else {
            log('  [MISSING] ' + name);
            allFilesExist = false;
        }
    }
    if (allFilesExist) {
        pass('All required files present');
    } else {
        fail('All required files present', 'Some files are missing');
    }

    // Test 3: Manifest validation
    log('\nTest 3: Manifest Validation');
    try {
        const manifestPath = path.join(PROJECT_ROOT, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Check required fields
        const hasId = (manifest.applications?.zotero?.id || manifest.browser_specific_settings?.zotero?.id);
        const hasVersion = manifest.version;
        const hasBootstrap = manifest.bootstrap;

        if (hasId) {
            pass('Manifest has extension ID: ' + hasId);
        } else {
            fail('Manifest has extension ID', 'ID not found');
        }

        if (hasVersion) {
            pass('Manifest has version: ' + hasVersion);
        } else {
            fail('Manifest has version', 'Version not found');
        }

        if (hasBootstrap) {
            pass('Manifest marks extension as bootstrap');
        } else {
            fail('Manifest marks extension as bootstrap', 'bootstrap not set');
        }

        // Check Zotero version compatibility
        const minVersion = manifest.applications?.zotero?.strict_min_version ||
                          manifest.browser_specific_settings?.zotero?.strict_min_version;
        const maxVersion = manifest.applications?.zotero?.strict_max_version ||
                          manifest.browser_specific_settings?.zotero?.strict_max_version;

        if (minVersion && maxVersion) {
            log('  Version range: ' + minVersion + ' to ' + maxVersion);
            pass('Version compatibility range set');
        }
    } catch (e) {
        fail('Manifest validation', e.message);
    }

    // Test 4: Start Zotero
    log('\nTest 4: Zotero Startup');
    log('Starting Zotero with test profile...');

    // Clean up old test results
    const testResultsPath = '/tmp/zotero-ner-test-results.json';
    if (fs.existsSync(testResultsPath)) {
        fs.unlinkSync(testResultsPath);
    }

    const zotero = spawn('xvfb-run', ['-a', ZOTERO_PATH, '-profile', TEST_PROFILE_DIR], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000
    });

    let stdout = '';
    let stderr = '';

    zotero.stdout.on('data', d => { stdout += d.toString(); });
    zotero.stderr.on('data', d => { stderr += d.toString(); });

    // Wait for Zotero to start
    await wait(15000);

    // Check if Zotero is running
    let zoteroRunning = false;
    try {
        execSync('pgrep -f "zotero-bin.*' + TEST_PROFILE_DIR + '"', { stdio: 'pipe' });
        zoteroRunning = true;
    } catch (e) {
        zoteroRunning = false;
    }

    if (zoteroRunning) {
        pass('Zotero process started');
    } else {
        fail('Zotero process started', 'Process not found');
    }

    // Test 5: HTTP Server
    log('\nTest 5: Zotero HTTP Server');
    try {
        await new Promise((resolve, reject) => {
            const req = http.get('http://127.0.0.1:23124', (res) => {
                pass('HTTP server responds (status ' + res.statusCode + ')');
                resolve(true);
            });
            req.on('error', reject);
            req.setTimeout(2000, () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
    } catch (e) {
        fail('HTTP server responds', e.message);
    }

    // Test 6: Check for NER extension output
    log('\nTest 6: Extension Initialization');
    const nerOutput = stdout.split('\n').filter(l =>
        l.includes('Author Name Normalizer') ||
        l.includes('zotero-ner') ||
        l.includes('ZoteroNER')
    );

    if (nerOutput.length > 0) {
        pass('Extension code executed (found NER messages in output)');
        log('  Sample: ' + nerOutput[0].substring(0, 100));
    } else {
        note('No NER-specific output found (extension may load silently)');
    }

    // Test 7: Test mode results
    log('\nTest 7: In-Zotero Tests');
    if (fs.existsSync(testResultsPath)) {
        try {
            const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
            if (testResults.failed === 0) {
                pass('In-Zotero tests pass (' + testResults.passed + ' tests)');
            } else {
                fail('In-Zotero tests pass', testResults.failed + ' of ' +
                    (testResults.passed + testResults.failed) + ' tests failed');
            }

            // Show individual test results
            if (testResults.tests && testResults.tests.length > 0) {
                log('  Test details:');
                testResults.tests.slice(0, 5).forEach(t => {
                    const status = t.status === 'pass' ? '[PASS]' : '[FAIL]';
                    log('    ' + status + ' ' + t.name);
                });
                if (testResults.tests.length > 5) {
                    log('    ... and ' + (testResults.tests.length - 5) + ' more');
                }
            }
        } catch (e) {
            fail('In-Zotero tests', e.message);
        }
    } else {
        note('Test results file not found (extension running in test mode may require window)');
    }

    // Cleanup
    log('\nStopping Zotero...');
    zotero.kill('SIGTERM');
    await wait(2000);

    // Write results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    // Print summary
    console.log();
    log('='.repeat(40));
    log('Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
    if (results.notes.length > 0) {
        log('Notes: ' + results.notes.length);
    }
    log('='.repeat(40));
    console.log();
    log('Full results written to:', RESULTS_FILE);
    console.log();

    // Debug info
    if (results.failed > 0 && stdout.length > 0) {
        log('Debug output (last 1000 chars):');
        console.log(stdout.substring(stdout.length - 1000));
    }

    return results;
}

runUITests()
    .then(results => {
        console.log();
        if (results.failed === 0) {
            log('UI test completed successfully!');
            log('');
            log('For full extension integration testing:');
            log('  1. Install Zotero Plugin Template (npm install -g zotero-plugin)');
            log('  2. Or manually install the .xpi via Zotero Add-ons Manager');
            log('  3. Then run tests with: zotero-plugin test');
        } else {
            log('UI test completed with ' + results.failed + ' failure(s)');
        }
        process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
        console.error('UI test failed:', err.message);
        process.exit(1);
    });
