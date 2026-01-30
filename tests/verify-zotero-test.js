/**
 * Minimal Zotero Test Verification
 *
 * Tests that Zotero can be started and extension loaded.
 * Run with: node tests/verify-zotero-test.js
 *
 * Supports:
 * - Linux Zotero (native Linux or /tmp/Zotero_linux-x86_64)
 * - Falls back to Windows Zotero via WSL
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXTENSION_PATH = path.join(PROJECT_ROOT, 'content');
const BUILD_PATH = path.join(EXTENSION_PATH, 'scripts', 'zotero-ner-bundled.js');
const TEST_PROFILE = path.join(__dirname, 'verify-profile');

// Find Zotero - prefer Linux Zotero
function findZotero() {
    const envPath = process.env.ZOTERO_PATH;

    // Priority: env var > /tmp > /usr/bin
    if (envPath && fs.existsSync(envPath)) {
        return envPath;
    }

    if (fs.existsSync('/tmp/Zotero_linux-x86_64/zotero')) {
        return '/tmp/Zotero_linux-x86_64/zotero';
    }

    if (fs.existsSync('/usr/bin/zotero')) {
        return '/usr/bin/zotero';
    }

    // Fall back to Windows path
    return '/mnt/c/Program Files/Zotero/zotero.exe';
}

const zoteroPath = findZotero();

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function main() {
    log("Zotero Extension Verification Test");
    log("===================================");
    console.log();
    log(`Using Zotero: ${zoteroPath}`);
    log(`Profile: ${TEST_PROFILE}`);

    // Check prerequisites
    log("\nChecking prerequisites...");

    if (!fs.existsSync(BUILD_PATH)) {
        log("ERROR: Extension not built. Run 'npm run build' first.");
        process.exit(1);
    }
    log("  [OK] Extension built");

    if (!fs.existsSync(zoteroPath)) {
        log(`ERROR: Zotero not found at ${zoteroPath}`);
        log("Please install Zotero for Linux or set ZOTERO_PATH");
        process.exit(1);
    }
    log("  [OK] Zotero found");

    // Create test profile
    log("\nCreating test profile...");
    fs.rmSync(TEST_PROFILE, { recursive: true, force: true });
    fs.mkdirSync(TEST_PROFILE, { recursive: true });

    // Write prefs.js
    fs.writeFileSync(path.join(TEST_PROFILE, 'prefs.js'), `
user_pref("app.update.enabled", false);
user_pref("services.sync.enabled", false);
user_pref("zotero.debug.log", true);
user_pref("zotero.debug.log.timestamp", true);
`);

    // Install extension
    const extDir = path.join(TEST_PROFILE, 'extensions', 'zotener@zotero-ner.github.com');
    fs.mkdirSync(extDir, { recursive: true });

    // Copy extension files
    for (const file of fs.readdirSync(EXTENSION_PATH)) {
        const src = path.join(EXTENSION_PATH, file);
        const dest = path.join(extDir, file);
        if (fs.statSync(src).isDirectory()) {
            copyDir(src, dest);
        } else {
            fs.copyFileSync(src, dest);
        }
    }
    log("  [OK] Extension installed");

    // Create install.rdf
    fs.writeFileSync(path.join(TEST_PROFILE, 'extensions', 'install.rdf'), `<?xml version="1.0"?>
<RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:em="http://www.mozilla.org/2004/em-rdf#">
  <Description about="urn:mozilla:extension:zotener@zotero-ner.github.com">
    <em:id>zotener@zotero-ner.github.com</em:id>
    <em:name>Zotero Author Name Normalizer</em:name>
    <em:version>1.0.0</em:version>
    <em:description>Normalizes author names</em:description>
    <em:targetApplication>
      <Description>
        <em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id>
        <em:minVersion>6.0</em:minVersion>
        <em:maxVersion>7.*</em:maxVersion>
      </Description>
    </em:targetApplication>
  </Description>
</RDF>
`);

    // Simple test code
    const testCode = `
(function() {
    var result = { zotero: false, ner: false, nameParser: false };
    try {
        result.zotero = typeof Zotero !== 'undefined';
        result.ner = typeof Zotero !== 'undefined' && typeof Zotero.NER !== 'undefined';
        if (result.ner) {
            result.nameParser = typeof Zotero.NER.nameParser !== 'undefined';
        }
    } catch(e) {
        result.error = e.message;
    }
    dump("RESULT:" + JSON.stringify(result) + "\\n");
})();
`;

    log("\nRunning test in Zotero...");
    log("(This may take 10-20 seconds)");

    const proc = spawn(zoteroPath, [
        '-profile', TEST_PROFILE,
        '-js', testCode
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('error', err => {
        log(`ERROR: ${err.message}`);
        process.exit(1);
    });

    proc.on('close', code => {
        console.log();
        log(`Zotero exited with code: ${code}`);

        // Parse result
        const match = stdout.match(/RESULT:({.*})/);
        if (match) {
            try {
                const result = JSON.parse(match[1]);
                console.log();
                log("Test Results:");
                log(`  Zotero defined: ${result.zotero ? 'YES' : 'NO'}`);
                log(`  Zotero.NER defined: ${result.ner ? 'YES' : 'NO'}`);
                log(`  nameParser defined: ${result.nameParser ? 'YES' : 'NO'}`);
                if (result.error) {
                    log(`  Error: ${result.error}`);
                }

                if (result.ner && result.nameParser) {
                    console.log();
                    log("SUCCESS: Extension loaded correctly!");
                    process.exit(0);
                } else {
                    console.log();
                    log("FAILURE: Extension not fully loaded");
                    process.exit(1);
                }
            } catch(e) {
                log(`Parse error: ${e.message}`);
            }
        }

        // No match - show raw output
        console.log();
        log("Raw output:");
        console.log(stdout.substring(0, 1000));
        if (stderr) {
            console.log("Stderr:", stderr.substring(0, 500));
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
