#!/usr/bin/env node
/**
 * Zotero NER Test Runner
 *
 * Runs tests inside Zotero by:
 * 1. Building the extension (webpack + xpi)
 * 2. Setting up a test profile with the extension properly installed
 * 3. Running Zotero with test mode enabled
 * 4. Collecting results from the test profile directory
 * 5. Exiting with proper status code
 *
 * Usage: node tests/zotero-framework/run-zotero-tests.js [--watch] [--debug]
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FRAMEWORK_DIR = path.dirname(__filename);
const TEST_PROFILE_DIR = path.join(FRAMEWORK_DIR, 'profile');
const EXTENSION_ID = 'zotero-ner-author-normalizer@marcinmilkowski.pl';
const EXTENSIONS_DIR = path.join(TEST_PROFILE_DIR, 'extensions');
const EXTENSION_PATH = path.join(EXTENSIONS_DIR, EXTENSION_ID);
const RESULTS_FILE = path.join(TEST_PROFILE_DIR, 'zotero-ner-test-results.json');

// Zotero paths - configurable via environment
const ZOTERO_PATH = process.env.ZOTERO_PATH || '/tmp/Zotero_linux-x86_64/zotero';
const ZOTERO_DATA_DIR = process.env.ZOTERO_DATA_DIR || path.join(FRAMEWORK_DIR, 'profile', 'zotero-data');

// Prefer installing the test add-on via the official extension proxy file method.
// No longer needed with proxy file approach.
const ZOTERO_INSTALL_DIR = path.dirname(ZOTERO_PATH);

function cleanupProxyFile() {
  try {
    const proxyPath = path.join(EXTENSIONS_DIR, EXTENSION_ID);
    if (fs.existsSync(proxyPath)) {
      fs.rmSync(proxyPath, { force: true });
    }
  } catch {
    // Best-effort cleanup only.
  }
}

// Output formatting
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  let prefix = '[INFO]';
  let color = COLORS.reset;

  switch (type) {
    case 'pass':
      prefix = '[PASS]';
      color = COLORS.green;
      break;
    case 'fail':
      prefix = '[FAIL]';
      color = COLORS.red;
      break;
    case 'warn':
      prefix = '[WARN]';
      color = COLORS.yellow;
      break;
    case 'error':
      prefix = '[ERROR]';
      color = COLORS.red;
      break;
    case 'debug':
      prefix = '[DEBUG]';
      color = COLORS.cyan;
      break;
  }

  console.log(`${COLORS.reset}${timestamp} ${color}${prefix}${COLORS.reset} ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = addr && typeof addr === 'object' ? addr.port : null;
      server.close(() => {
        if (typeof port === 'number') {
          resolve(port);
        } else {
          reject(new Error('Failed to allocate a free port'));
        }
      });
    });
  });
}

function findZoteroBinPidForProfile(profileDir) {
  try {
    const out = execSync(`pgrep -f "zotero-bin.*-profile\\s+${profileDir.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    const pids = String(out)
      .split(/\s+/)
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => Number(v))
      .filter(n => Number.isFinite(n) && n > 0);
    return pids.length ? pids[0] : null;
  } catch {
    return null;
  }
}

function tailLines(text, maxLines = 50) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

function grepLines(text, pattern, maxMatches = 80) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), 'i');
  const lines = String(text || '').split(/\r?\n/);
  const matches = [];
  for (const line of lines) {
    if (re.test(line)) {
      matches.push(line);
      if (matches.length >= maxMatches) break;
    }
  }
  return matches.join('\n');
}

function ensureZipAvailable() {
  try {
    execSync('zip -v', { stdio: 'ignore' });
  } catch {
    throw new Error('`zip` not found. Install it (e.g., `apt-get install zip`) to run Zotero-native tests.');
  }
}

function ensurePython3Available() {
  try {
    execSync('python3 --version', { stdio: 'ignore' });
  } catch {
    throw new Error('`python3` not found. It is required to write mozLz4 startup data for Zotero-native tests.');
  }
}

function writeMozLz4Json(filePath, obj) {
  ensurePython3Available();
  const json = JSON.stringify(obj);
  const script = [
    'import sys',
    'import lz4.block',
    'data=sys.stdin.buffer.read()',
    "sys.stdout.buffer.write(b'mozLz40\\0' + lz4.block.compress(data))",
  ].join('\n');

  const res = require('child_process').spawnSync('python3', ['-c', script], {
    input: json,
    encoding: null,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString('utf8') : '';
    throw new Error(`python3 mozLz4 write failed (exit ${res.status}): ${stderr}`);
  }
  fs.writeFileSync(filePath, res.stdout);
}

function createXpiFromDir(sourceDir, outXpiPath) {
  ensureZipAvailable();
  if (fs.existsSync(outXpiPath)) {
    fs.rmSync(outXpiPath, { force: true });
  }
  // Zip the contents of sourceDir so the add-on files are at the archive root.
  execSync(`zip -qr "${outXpiPath}" .`, { cwd: sourceDir, stdio: 'ignore' });
}

/**
 * Build the extension using webpack and create xpi
 */
async function buildExtension() {
  log('Building extension with webpack...');

  const webpackBin = process.platform === 'win32' ? 'webpack.cmd' : 'webpack';
  const webpackPath = path.join(PROJECT_ROOT, 'node_modules', '.bin', webpackBin);
  const webpackConfig = path.join(PROJECT_ROOT, 'webpack.config.js');

  if (!fs.existsSync(webpackPath)) {
    throw new Error('webpack not found. Run npm install first.');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(webpackPath, [
      '--mode', 'production',
      '--config', webpackConfig
    ], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        log('Webpack build completed');
        resolve(true);
      } else {
        log('Webpack build failed: ' + stderr, 'error');
        reject(new Error('Webpack build failed'));
      }
    });

    child.on('error', (err) => {
      log('Webpack error: ' + err.message, 'error');
      reject(err);
    });
  });
}

/**
 * Setup test profile with extension properly installed
 */
function setupTestProfile() {
  log('Setting up test profile...');

  // Clean up existing profile - with retry logic for locked directories
  if (fs.existsSync(TEST_PROFILE_DIR)) {
    const maxRetries = 3;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        fs.rmSync(TEST_PROFILE_DIR, { recursive: true, force: true });
        log('Cleaned existing profile directory');
        break;
      } catch (e) {
        if (retry < maxRetries - 1) {
          log(`Profile directory busy, retrying (${retry + 1}/${maxRetries})...`, 'warn');
          sleep(1000);
        } else {
          log('Could not clean profile directory, using timestamped name', 'warn');
          // Use a new profile directory with timestamp
          const timestamp = Date.now();
          const newProfileDir = TEST_PROFILE_DIR + '-' + timestamp;
          fs.renameSync(TEST_PROFILE_DIR, newProfileDir);
          fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });
          return setupTestProfile(); // Recursively setup in new directory
        }
      }
    }
  } else {
    fs.mkdirSync(TEST_PROFILE_DIR, { recursive: true });
  }

  fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_PROFILE_DIR, 'zotero-data'), { recursive: true });

  // Create a minimal, profile-local unpacked add-on directory and point Zotero to it.
  // Zotero may treat pointers to out-of-profile paths as disabled for safety.
  const addonDir = path.join(TEST_PROFILE_DIR, 'addon-src');
  fs.mkdirSync(addonDir, { recursive: true });

  // Files and directories to copy into the add-on directory
  const itemsToCopy = [
    'bootstrap.js',
    'manifest.json',
    'content',
    'update.json',
  ];

  for (const item of itemsToCopy) {
    const src = path.join(PROJECT_ROOT, item);
    const dest = path.join(addonDir, item);

    if (!fs.existsSync(src)) {
      log('Warning: Source not found: ' + src, 'warn');
      continue;
    }

    try {
      if (item === 'manifest.json') {
        // Test-only manifest: avoid locale registration during XPIDatabase metadata load.
        // Some Gecko builds can throw in registerLocales and mark the add-on invalid.
        const raw = fs.readFileSync(src, 'utf8');
        const manifest = JSON.parse(raw);
        delete manifest.default_locale;
        if (typeof manifest.name === 'string' && manifest.name.startsWith('__MSG_')) {
          manifest.name = 'Zotero NER Author Name Normalizer (Test)';
        }
        if (
          typeof manifest.description === 'string' &&
          manifest.description.startsWith('__MSG_')
        ) {
          manifest.description = 'Test manifest for Zotero-native UI tests';
        }
        fs.writeFileSync(dest, JSON.stringify(manifest, null, 2));
      } else if (fs.statSync(src).isDirectory()) {
        copyDirectory(src, dest);
      } else {
        fs.copyFileSync(src, dest);
      }
    } catch (e) {
      log('Warning: Could not copy ' + item + ': ' + e.message, 'warn');
    }
  }

  // Copy only the in-extension Zotero-native test harness.
  const frameworkTestsSrc = path.join(PROJECT_ROOT, 'tests', 'zotero-framework', 'test');
  const frameworkTestsDest = path.join(addonDir, 'tests', 'zotero-framework', 'test');
  if (fs.existsSync(frameworkTestsSrc)) {
    try {
      copyDirectory(frameworkTestsSrc, frameworkTestsDest);
    } catch (e) {
      log('Warning: Could not copy zotero-framework tests: ' + e.message, 'warn');
    }
  } else {
    log('Warning: zotero-framework test bundle not found: ' + frameworkTestsSrc, 'warn');
  }

  // Use the official Zotero extension proxy file method for loading from source.
  // This is the standard approach documented at:
  // https://www.zotero.org/support/dev/client_coding/plugin_development
  //
  // Create a text file in profile/extensions/ named after the extension ID,
  // containing the absolute path to the plugin source directory.
  const proxyFilePath = path.join(EXTENSIONS_DIR, EXTENSION_ID);
  try {
    // Point to PROJECT_ROOT (where bootstrap.js/install.rdf live) so Zotero loads
    // the actual built extension, not the temporary addon-src staging directory.
    fs.writeFileSync(proxyFilePath, PROJECT_ROOT);
    log(`Created extension proxy file: ${proxyFilePath}`, 'debug');
  } catch (e) {
    log(`Warning: Could not create extension proxy file: ${e.message}`, 'warn');
  }

  // Create prefs.js for the test profile
  const prefsContent = `// Mozilla User Preferences
// Test profile for Zotero NER extension testing

// Disable automatic updates
user_pref("app.update.enabled", false);
user_pref("app.update.autoUpdateEnabled", false);

// Disable sync
user_pref("services.sync.enabled", false);
user_pref("services.sync.server.enabled", false);

// Allow loading profile-scoped extensions in automation.
// Some Gecko-based apps restrict extension scopes by default and may remove
// unknown add-ons from the profile on startup.
user_pref("xpinstall.signatures.required", false);
user_pref("extensions.enabledScopes", 15);
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.sideloadScopes", 15);
user_pref("extensions.installDistroAddons", true);

// Enable verbose add-on manager logging (routes addons.* logs to stderr).
user_pref("extensions.logging.enabled", true);

// Route chrome/content console output to stdout/stderr so add-on install
// failures become visible in CI logs.
user_pref("browser.dom.window.dump.enabled", true);
user_pref("devtools.console.stdout.chrome", true);
user_pref("devtools.console.stdout.content", true);

// Force-enable the test add-on (bootstrapped) when installed via pointer file.
// This helps in fresh profiles where profile-scoped bootstrapped add-ons may
// start out disabled until explicitly enabled.
user_pref("extensions.enabledAddons", "${EXTENSION_ID}:1.0.0");

// Test mode for Zotero NER
user_pref("extensions.zotero-ner.testMode", true);

// Results path for Zotero-native test runner
user_pref("extensions.zotero-ner.testResultsPath", "${RESULTS_FILE.replace(/\\/g, '\\\\')}");

// Enable debug logging
user_pref("zotero.debug.log", true);
user_pref("zotero.debug.log.timestamp", true);

// Headless/Xvfb stability: disable GPU/WebRender paths that can crash in CI
user_pref("gfx.webrender.all", false);
user_pref("gfx.webrender.enabled", false);
user_pref("gfx.webrender.force-disabled", true);
user_pref("layers.acceleration.disabled", true);

// Speed up tests
user_pref("nglayout.initialpaint.delay", 0);
user_pref("content.notify.interval", 100);

// Disable automatic backups
user_pref("zotero.backup.enabled", false);
user_pref("zotero.autoBackup.interval", 0);

// Zotero HTTP server for test communication
user_pref("extensions.zotero.httpServer.enabled", true);
user_pref("extensions.zotero.httpServer.port", ${setupTestProfile.httpPort || 23124});

// Use local data directory
user_pref("extensions.zotero.useDataDir", true);
user_pref("extensions.zotero.dataDir", "${ZOTERO_DATA_DIR.replace(/\\/g, '\\\\')}");

// Skip first run
user_pref("extensions.zotero.firstRun.skipFirefoxProfileAccessCheck", true);
user_pref("extensions.zotero.firstRun2", false);
`;

  fs.writeFileSync(path.join(TEST_PROFILE_DIR, 'prefs.js'), prefsContent);

  // Force Zotero to re-scan the extensions directory on startup by deleting
  // the extension cache prefs. This is required for the proxy file method.
  // See: https://www.zotero.org/support/dev/client_coding/plugin_development
  const prefsPath = path.join(TEST_PROFILE_DIR, 'prefs.js');
  try {
    let prefs = fs.readFileSync(prefsPath, 'utf8');
    // Remove lines containing these prefs to force extension re-scan
    prefs = prefs.split('\n')
      .filter(line => !line.includes('extensions.lastAppBuildId'))
      .filter(line => !line.includes('extensions.lastAppVersion'))
      .join('\n');
    fs.writeFileSync(prefsPath, prefs);
    log('Removed extension cache prefs to force re-scan', 'debug');
  } catch (e) {
    log('Warning: Could not remove extension cache prefs: ' + e.message, 'warn');
  }

  log('Test profile setup complete');
  return true;
}

/**
 * Copy directory recursively
 */
function copyDirectory(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const items = fs.readdirSync(srcDir);

  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Wait for Zotero to start and be ready
 */
async function waitForZotero(port = 23124, timeout = 30000) {
  log('Waiting for Zotero HTTP server on port ' + port + '...');

  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
          // Make the readiness check Zotero-specific so we don't get false positives
          // from a stray process.
          const zoteroVersion = res.headers && (res.headers['x-zotero-version'] || res.headers['X-Zotero-Version']);
          if (zoteroVersion) {
            resolve(true);
          } else {
            reject(new Error('Non-Zotero HTTP server responded'));
          }
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(500, () => { req.destroy(); reject(); });
        req.end();
      });
      return true;
    } catch (e) {
      await sleep(500);
    }
  }

  return false;
}

/**
 * Run Zotero with test mode and collect results
 */
async function runZoteroTests(debug = false) {
  // Clean up old results
  if (fs.existsSync(RESULTS_FILE)) {
    fs.unlinkSync(RESULTS_FILE);
  }

  log('Starting Zotero with test profile...');

  // Check if Zotero exists
  if (!fs.existsSync(ZOTERO_PATH)) {
    throw new Error(`Zotero not found at: ${ZOTERO_PATH}. Set ZOTERO_PATH environment variable.`);
  }

  const env = { ...process.env };

  // CI/Xvfb stability: force X11 backend and avoid Wayland/WebRender paths that
  // can trigger SWGL compositor crashes.
  env.MOZ_ENABLE_WAYLAND = '0';
  env.GDK_BACKEND = 'x11';
  env.MOZ_WEBRENDER = '0';
  env.MOZ_ACCELERATED = '0';
  env.MOZ_AUTOMATION = '1';

  // For UI tests we need a display server. Prefer a DISPLAY provided by the caller
  // (e.g., via `xvfb-run -a`). Only set a fallback if none is present.
  if (!env.DISPLAY) {
    const displays = [99, 100, 101, 102, 103, 107, 108, 109, 110, 111, 112, 113, 114];
    const display = displays.find(d => {
      try {
        fs.statSync(`/tmp/.X${d}-lock`);
        return false;
      } catch (e) {
        return true;
      }
    }) || 99;
    env.DISPLAY = `:${display}`;
    log(`DISPLAY not set; defaulting to ${env.DISPLAY} (start Xvfb or use xvfb-run)`, 'warn');
  }

  if (debug) {
    env.DEBUG_ZOTERO_TESTS = '1';
  }

  // When debugging addon installation/startup issues, enable Gecko logging.
  // This Zotero build produces output via NSPR logging (NSPR_LOG_MODULES),
  // which is more reliable here than MOZ_LOG.
  const nsprLogFile = path.join(TEST_PROFILE_DIR, 'nspr.log');
  const mozLogFile = path.join(TEST_PROFILE_DIR, 'moz.log');
  if (debug) {
    // `all:5` is noisy but tends to include the reason an XPI is rejected.
    // We only surface the tail in runner diagnostics.
    env.NSPR_LOG_MODULES = 'all:5';
    env.NSPR_LOG_FILE = nsprLogFile;

    // Try MOZ_LOG as well; keep it focused on add-on install/startup.
    // (Including nsHttp makes the logs too noisy and can hide add-on errors in the tail.)
    env.MOZ_LOG = 'addons.xpi:5,addons.manager:5,AddonManager:5,signing:5';
    env.MOZ_LOG_FILE = mozLogFile;
  }

  // Prefer launching zotero-bin directly so the zotero wrapper script can't
  // override env vars (it force-enables Wayland).
  let zoteroExe = ZOTERO_PATH;
  let zoteroArgs = [
    '-profile', TEST_PROFILE_DIR,
    '-no-remote',
  ];

  try {
    const zoteroDir = path.dirname(ZOTERO_PATH);
    const zoteroBin = path.join(zoteroDir, 'zotero-bin');
    const applicationIni = path.join(zoteroDir, 'app', 'application.ini');
    if (
      path.basename(ZOTERO_PATH) === 'zotero' &&
      fs.existsSync(zoteroBin) &&
      fs.existsSync(applicationIni)
    ) {
      zoteroExe = zoteroBin;
      zoteroArgs = ['-app', applicationIni, ...zoteroArgs];
    }
  } catch {
    // Non-fatal; fall back to ZOTERO_PATH.
  }
  // (No CLI args needed for NSPR logging; it's configured via env vars.)

  const zotero = spawn(zoteroExe, zoteroArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env
  });

  // zotero-bin may fork/detach; track the real process by profile path.
  let zoteroBinPid = null;

  let stdout = '';
  let stderr = '';
  let testOutput = '';

  zotero.stdout.on('data', (data) => {
    const text = data.toString();
    stdout += text;
    if (debug) {
      process.stdout.write(text);
    }
    // Capture test output
    if (text.includes('[NER Test]') || text.includes('PASS') || text.includes('FAIL')) {
      testOutput += text;
    }
  });

  zotero.stderr.on('data', (data) => {
    const text = data.toString();
    stderr += text;
    if (debug) {
      process.stderr.write(text);
    }
  });

  const startTime = Date.now();

  // Wait for Zotero to start
  const zoteroStarted = await waitForZotero(setupTestProfile.httpPort || 23124);

  if (!zoteroStarted) {
    log('Zotero failed to start within timeout', 'error');
    zotero.kill('SIGTERM');

    // Show any debug output we have
    if (testOutput) {
      log('Debug output from Zotero:', 'debug');
      console.log(testOutput);
    }

    throw new Error('Zotero startup timeout');
  }

  log('Zotero started successfully');

  zoteroBinPid = findZoteroBinPidForProfile(TEST_PROFILE_DIR) || zotero.pid;

  // Wait for tests to complete (Zotero should exit after tests)
  const testTimeout = 60000; // 60 seconds for tests
  const checkInterval = 500;
  let waited = 0;

  let lastHeartbeatAt = 0;
  let lastStdoutLen = 0;
  let lastStderrLen = 0;

  while (waited < testTimeout) {
    await sleep(checkInterval);
    waited += checkInterval;

    // Check if results file exists
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        const content = fs.readFileSync(RESULTS_FILE, 'utf8');
        const results = JSON.parse(content);

        // Kill Zotero if still running
        try {
          process.kill(zotero.pid, 0);
          zotero.kill('SIGTERM');
        } catch (e) {
          // Process already dead
        }

        return results;
      } catch (e) {
        log('Error reading results: ' + e.message, 'error');
      }
    }

    // Check if Zotero is still running
    try {
      process.kill(zoteroBinPid, 0);
    } catch (e) {
      // Process not running
      log('Zotero exited before results were written', 'warn');
      break;
    }

    // Heartbeat + debug tail while waiting
    if (waited - lastHeartbeatAt >= 10000) {
      lastHeartbeatAt = waited;
      log(`Still waiting for tests... (${waited / 1000}s)`);

      const newStdout = stdout.length !== lastStdoutLen;
      const newStderr = stderr.length !== lastStderrLen;
      lastStdoutLen = stdout.length;
      lastStderrLen = stderr.length;

      if (debug && (newStdout || newStderr)) {
        if (newStdout) {
          log('--- Zotero stdout (tail) ---', 'debug');
          console.log(tailLines(stdout, 40));
        }
        if (newStderr) {
          log('--- Zotero stderr (tail) ---', 'debug');
          console.error(tailLines(stderr, 40));
        }
      }
    }
  }

  // Timeout or Zotero died - try to get partial results
  log('Timeout or Zotero exited, trying to read results...', 'warn');

  try {
    process.kill(zoteroBinPid, 0);
    process.kill(zoteroBinPid, 'SIGTERM');
  } catch (e) {
    // Already dead
  }

  if (fs.existsSync(RESULTS_FILE)) {
    try {
      const content = fs.readFileSync(RESULTS_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      log('Could not parse results file: ' + e.message, 'error');
    }
  }

  // Return error result
  const finalStdoutTail = tailLines(stdout, 200);
  const finalStderrTail = tailLines(stderr, 200);
  let nsprLogTail = '';
  let mozLogTail = '';
  let mozLogMatches = '';
  try {
    if (fs.existsSync(nsprLogFile)) {
      nsprLogTail = tailLines(fs.readFileSync(nsprLogFile, 'utf8'), 250);
    }
  } catch (e) {
    nsprLogTail = 'Could not read nspr.log: ' + e.message;
  }
  try {
    const candidates = [
      mozLogFile,
      `${mozLogFile}.moz_log`,
      `${mozLogFile}.child-1.moz_log`,
      `${mozLogFile}.child-2.moz_log`,
    ].filter(p => fs.existsSync(p));

    const parts = [];
    const matchParts = [];
    for (const file of candidates) {
      const content = fs.readFileSync(file, 'utf8');
      const tail = tailLines(content, 250);
      if (tail.trim()) {
        parts.push(`--- ${path.basename(file)} ---\n${tail}`);
      }

      // Also grep for install-time errors (these can occur early and get pushed
      // out of the tail if logs are noisy).
      const hits = grepLines(
        content,
        /(distribution|staged add-on|xpi|xpidatabase|xpiprovider|addon|install|invalid|reject|signature|registerLocales)/i,
        120
      );
      if (hits.trim()) {
        matchParts.push(`--- ${path.basename(file)} (matches) ---\n${hits}`);
      }
    }
    mozLogTail = parts.join('\n');
    mozLogMatches = matchParts.join('\n');
  } catch (e) {
    mozLogTail = 'Could not read MOZ_LOG files: ' + e.message;
  }
  log('--- Final Zotero stdout (tail) ---', debug ? 'debug' : 'warn');
  console.log(finalStdoutTail);
  log('--- Final Zotero stderr (tail) ---', debug ? 'debug' : 'warn');
  console.error(finalStderrTail);
  if (nsprLogTail) {
    log('--- Final NSPR_LOG (tail) ---', debug ? 'debug' : 'warn');
    console.log(nsprLogTail);
  }
  if (mozLogTail) {
    log('--- Final MOZ_LOG (tail) ---', debug ? 'debug' : 'warn');
    console.log(mozLogTail);
  }
  if (mozLogMatches) {
    log('--- Final MOZ_LOG (matches) ---', debug ? 'debug' : 'warn');
    console.log(mozLogMatches);
  }
  return {
    passed: 0,
    failed: 1,
    tests: [{
      name: 'Test Runner',
      status: 'fail',
      error: 'Timeout: Zotero did not complete tests within ' + (testTimeout / 1000) + ' seconds'
    }],
    diagnostics: {
      stdoutTail: finalStdoutTail,
      stderrTail: finalStderrTail,
      nsprLogTail: nsprLogTail,
      mozLogTail: mozLogTail,
      mozLogMatches: mozLogMatches,
    },
    timestamp: Date.now(),
    duration: Date.now() - startTime,
    timedOut: true
  };
}

/**
 * Print test results in a nice format
 */
function printResults(results, debug = false) {
  console.log();
  console.log(COLORS.bold + '='.repeat(60));
  console.log('Zotero NER Test Results');
  console.log('='.repeat(60) + COLORS.reset);

  console.log(`Duration: ${results.duration || 0}ms`);

  if (results.timedOut) {
    console.log(COLORS.yellow + 'Status: TIMEOUT' + COLORS.reset);
  }

  const total = (results.passed || 0) + (results.failed || 0);
  console.log(`Passed: ${COLORS.green}${results.passed || 0}${COLORS.reset}`);
  console.log(`Failed: ${COLORS.red}${results.failed || 0}${COLORS.reset}`);
  console.log(`Total:  ${total}`);
  console.log('='.repeat(60));

  if (results.tests && results.tests.length > 0) {
    console.log();
    console.log(COLORS.bold + 'Test Details:' + COLORS.reset);

    for (const test of results.tests) {
      const symbol = test.status === 'pass' ? COLORS.green + '[PASS]' + COLORS.reset : COLORS.red + '[FAIL]' + COLORS.reset;
      console.log(`  ${symbol} ${test.name}`);

      if (test.status === 'fail' && test.error) {
        console.log(`         ${COLORS.yellow}Error: ${test.error}${COLORS.reset}`);
      }

      if (debug && test.details) {
        console.log(`         Details: ${JSON.stringify(test.details)}`);
      }
    }
  }

  console.log('='.repeat(60));
}

/**
 * Main test runner
 */
async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch') || args.includes('-w');
  const debugMode = args.includes('--debug') || args.includes('-d');

  console.log();
  log('Zotero NER Test Runner');
  log('======================');
  console.log();
  log(`Zotero: ${ZOTERO_PATH}`);
  log(`Profile: ${TEST_PROFILE_DIR}`);
  log(`Results: ${RESULTS_FILE}`);
  console.log();

  if (watchMode) {
    log('Watch mode enabled - tests will run continuously');
  }

  async function runTestCycle() {
    // Don't cleanup proxy file here - it needs to exist when Zotero starts!
    try {
      // Step 1: Build extension
      await buildExtension();

      // Step 2: Setup test profile
      setupTestProfile.httpPort = await getFreePort();
      log(`Using Zotero HTTP server port: ${setupTestProfile.httpPort}`);
      setupTestProfile();

      // Step 3: Run Zotero tests
      const results = await runZoteroTests(debugMode);

      // Step 4: Print results
      printResults(results, debugMode);

      // Return exit code
      return results;
    } catch (e) {
      log('Fatal error: ' + e.message, 'error');
      console.error(e);

      return {
        passed: 0,
        failed: 1,
        tests: [{ name: 'Test Runner', status: 'fail', error: e.message }],
        error: e.message
      };
    } finally {
      cleanupProxyFile();
    }
  }

  if (watchMode) {
    log('Watch mode - press Ctrl+C to exit');
    let iteration = 0;

    while (true) {
      iteration++;
      console.log(COLORS.cyan + `\n--- Iteration ${iteration} ---` + COLORS.reset);

      const results = await runTestCycle();
      const exitCode = results.failed > 0 || results.error ? 1 : 0;

      if (results.failed > 0) {
        log('Some tests failed. Waiting 10 seconds before re-running...');
        await sleep(10000);
      } else {
        log('All tests passed! Waiting 30 seconds before re-running...');
        await sleep(30000);
      }
    }
  } else {
    const results = await runTestCycle();
    const exitCode = results.failed > 0 || results.error ? 1 : 0;

    console.log();
    if (exitCode === 0) {
      log('SUCCESS: All tests passed!');
    } else {
      log('FAILURE: Some tests failed');
    }

    process.exit(exitCode);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error('Unhandled error:', e);
    process.exit(1);
  });
}

module.exports = { main, buildExtension, setupTestProfile, runZoteroTests };
