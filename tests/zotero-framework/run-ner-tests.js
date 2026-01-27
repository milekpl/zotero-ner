/**
 * Zotero NER Test Runner - Using HTTP server for results
 *
 * Runs tests by:
 * 1. Starting Zotero with test code that POSTs results to a local HTTP server
 * 2. The HTTP server receives results and exits
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FRAMEWORK_DIR = path.dirname(__filename);
const TEST_PROFILE_DIR = path.join(FRAMEWORK_DIR, 'profile');
const RESULTS_FILE = '/tmp/zotero-ner-test-results.json';

const ZOTERO_PORT = 23123; // Use different port from Zotero's internal server

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

// Generate test code that sends results via HTTP
function generateTestJS() {
    return `
// Zotero NER Test Suite - HTTP Results
(function() {
    "use strict";

    var results = { passed: 0, failed: 0, tests: [], timestamp: Date.now() };

    function log(msg) {
        Zotero.debug("[NER Test] " + msg);
    }

    function pass(name) {
        results.passed++;
        results.tests.push({ name: name, status: 'pass' });
        log("PASS: " + name);
    }

    function fail(name, error) {
        results.failed++;
        results.tests.push({ name: name, status: 'fail', error: error });
        log("FAIL: " + name + " - " + error);
    }

    function assert(condition, name, error) {
        if (condition) pass(name); else fail(name, error || 'assertion failed');
    }

    function assertEqual(actual, expected, name) {
        if (actual === expected) {
            pass(name);
        } else {
            fail(name, "Expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
        }
    }

    function sendResults() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "http://localhost:${ZOTERO_PORT}/test-results", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onerror = function() {
                log("Failed to send results: " + xhr.statusText);
                writeFileFallback();
            };
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    log("Results sent successfully");
                } else {
                    log("HTTP error: " + xhr.status);
                    writeFileFallback();
                }
            };
            xhr.send(JSON.stringify(results));
        } catch(e) {
            log("Send error: " + e.message);
            writeFileFallback();
        }
    }

    function writeFileFallback() {
        try {
            var file = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath("/tmp/zotero-ner-test-results.json");
            var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                .createInstance(Components.interfaces.nsIFileOutputStream);
            stream.init(file, 0x02 | 0x08 | 0x20, 0o644, 0);
            stream.write(JSON.stringify(results), JSON.stringify(results).length);
            stream.close();
            log("Results written to file");
        } catch(e) {
            log("Fallback write error: " + e.message);
        }
    }

    function runTests() {
        log("Starting Zotero NER tests...");
        log("Zotero version: " + Zotero.version);
        log("Zotero.NER: " + (typeof Zotero.NER !== 'undefined' ? "LOADED" : "NOT FOUND"));

        assert(typeof Zotero !== 'undefined', "Zotero defined");
        assert(typeof Zotero.NER !== 'undefined', "Zotero.NER defined");

        if (typeof Zotero.NER !== 'undefined') {
            var modules = ['nameParser', 'learningEngine', 'candidateFinder',
                           'nerProcessor', 'variantGenerator', 'menuIntegration', 'itemProcessor'];
            var allPresent = true;
            for (var i = 0; i < modules.length; i++) {
                if (!Zotero.NER[modules[i]]) {
                    allPresent = false;
                    log("  Missing: " + modules[i]);
                }
            }
            assert(allPresent, "All modules present");

            if (Zotero.NER.nameParser) {
                var p = Zotero.NER.nameParser.parse("John Smith");
                assertEqual(p.firstName, "John", "Name parser: firstName");
                assertEqual(p.lastName, "Smith", "Name parser: lastName");
            }

            if (Zotero.NER.learningEngine) {
                var key = "Test_" + Date.now();
                Zotero.NER.learningEngine.storeMapping(key, "TestValue", 0.9);
                var m = Zotero.NER.learningEngine.getMapping(key);
                assert(m !== null && m.normalized === "TestValue", "Learning engine: store/retrieve");
            }

            if (Zotero.NER.candidateFinder) {
                var c = Zotero.NER.candidateFinder.findPotentialVariants(["Smith", "Smyth"]);
                assert(Array.isArray(c) && c.length > 0, "Candidate finder works");
            }

            if (Zotero.NER.variantGenerator) {
                var v = Zotero.NER.variantGenerator.generateVariants("Smith");
                assert(Array.isArray(v) && v.length > 0, "Variant generator works");
            }

            if (Zotero.NER.nerProcessor) {
                var a = Zotero.NER.nerProcessor.extractAuthors("John Smith");
                assert(Array.isArray(a), "NER processor works");
            }
        }

        log("Tests complete: " + results.passed + "/" + (results.passed + results.failed));
        sendResults();
    }

    setTimeout(function() {
        try {
            runTests();
        } catch(e) {
            log("Error: " + e.message);
            writeFileFallback();
        }
    }, 3000);
})();
`;
}

function createHTTPServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/test-results') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    try {
                        const results = JSON.parse(body);
                        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
                        log('Results received: ' + results.passed + ' passed, ' + results.failed + ' failed');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end('{"status":"ok"}');
                        server.close();
                        process.exit(0);
                    } catch(e) {
                        log('Parse error: ' + e.message);
                        res.writeHead(500);
                        res.end('{"error":"' + e.message + '"}');
                    }
                });
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(ZOTERO_PORT, '127.0.0.1', () => {
            log('HTTP server listening on port ' + ZOTERO_PORT);
            resolve(server);
        });

        server.on('error', reject);
    });
}

async function main() {
    log('Zotero NER Test Runner (HTTP mode)');
    log('===================================');
    console.log();

    // Clean up
    if (fs.existsSync(RESULTS_FILE)) {
        fs.unlinkSync(RESULTS_FILE);
    }

    // Setup profile
    fs.rmSync(TEST_PROFILE_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });

    fs.writeFileSync(path.join(TEST_PROFILE_DIR, 'prefs.js'), `
user_pref("app.update.enabled", false);
user_pref("services.sync.enabled", false);
user_pref("zotero.debug.log", true);
user_pref("zotero.debug.log.timestamp", true);
user_pref("extensions.zotero.httpServer.enabled", true);
user_pref("extensions.zotero.httpServer.port", 23124);
`);

    const extId = 'zotero-ner-author-normalizer@marcinmilkowski.pl';
    fs.writeFileSync(path.join(TEST_PROFILE_DIR, 'extensions.ini'), `[ExtensionDirs]
Extension0=${path.join(TEST_PROFILE_DIR, 'extensions', extId)}
`);

    const extDir = path.join(TEST_PROFILE_DIR, 'extensions', extId);
    fs.mkdirSync(extDir, { recursive: true });

    const contentDir = path.join(PROJECT_ROOT, 'content');
    for (const file of fs.readdirSync(contentDir)) {
        const src = path.join(contentDir, file);
        const dest = path.join(extDir, file);
        if (fs.statSync(src).isDirectory()) {
            copyDir(src, dest);
        } else {
            fs.copyFileSync(src, dest);
        }
    }

    fs.writeFileSync(path.join(extDir, 'install.rdf'), `<?xml version="1.0"?>
<RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:em="http://www.mozilla.org/2004/em-rdf#">
  <Description about="urn:mozilla:extension:${extId}">
    <em:id>${extId}</em:id>
    <em:name>Zotero NER</em:name>
    <em:version>1.0.0</em:version>
    <em:targetApplication>
      <Description>
        <em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id>
        <em:minVersion>6.0</em:minVersion>
        <em:maxVersion>8.*</em:maxVersion>
      </Description>
    </em:targetApplication>
  </Description>
</RDF>
`);

    // Start HTTP server
    const server = await createHTTPServer();

    // Run Zotero with test code
    const testCode = generateTestJS();
    const zoteroPath = '/tmp/Zotero_linux-x86_64/zotero';

    log('Starting Zotero...');

    const proc = spawn('xvfb-run', ['-a', zoteroPath,
        '-profile', TEST_PROFILE_DIR,
        '-js', testCode
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    // Wait for results or timeout
    let attempts = 0;
    const maxAttempts = 120;

    const checkResults = setInterval(() => {
        attempts++;
        if (fs.existsSync(RESULTS_FILE)) {
            clearInterval(checkResults);
            server.close();
            proc.kill();

            const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
            console.log();
            log('Test Results:');
            log('  Passed: ' + results.passed);
            log('  Failed: ' + results.failed);
            log('  Total: ' + results.tests.length);
            console.log();

            if (results.failed === 0) {
                log('SUCCESS: All tests passed!');
                process.exit(0);
            } else {
                log('FAILURE: ' + results.failed + ' tests failed');
                process.exit(1);
            }
        }

        if (attempts >= maxAttempts) {
            clearInterval(checkResults);
            server.close();
            proc.kill('SIGTERM');
            console.log();
            log('TIMEOUT: No results after 60 seconds');

            // Show debug output
            const debugLines = stdout.split('\n').filter(l => l.includes('[NER Test]'));
            if (debugLines.length > 0) {
                console.log('\nDebug output:');
                debugLines.forEach(l => console.log(l));
            }
            process.exit(1);
        }
    }, 500);

    proc.on('close', (code) => {
        if (code !== 0 && code !== 143) {
            log('Zotero exited with code: ' + code);
        }
    });
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
