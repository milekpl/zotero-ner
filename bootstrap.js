/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Bootstrap file for Zotero NER Author Name Normalizer Extension
 * Based on Zotero 7/8 hybrid extension approach
 */

// Import Services with ESM for Zotero 8, fallback to JSM for Zotero 6/7
var Services;
try {
  Services = ChromeUtils.importESModule('resource://gre/modules/Services.sys.mjs').Services;
} catch (e) {
  Services = ChromeUtils.import('resource://gre/modules/Services.jsm').Services;
}

var chromeHandle;
var windowListener;
var zoteroNERScope;
var registeredRootURI;

// Console polyfill for Zotero 8 - console not available in bootstrap scope
// Use Zotero.debug instead
function log(message) {
  if (typeof Zotero !== 'undefined' && Zotero.debug) {
    Zotero.debug('NER Author Name Normalizer: ' + message);
  }
}

function install(_data, _reason) {}

async function startup({ resourceURI, rootURI }, reason) {
  Zotero.debug('NER Author Name Normalizer: startup called');
  await Zotero.initializationPromise;
  Zotero.debug('NER Author Name Normalizer: Zotero initializationPromise resolved.');

  // String 'rootURI' introduced in Zotero 7
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  if (!rootURI.endsWith('/')) {
    rootURI += '/';
  }

  registeredRootURI = rootURI;
  globalThis.registeredRootURI = registeredRootURI;

  var aomStartup = Components.classes[
    '@mozilla.org/addons/addon-manager-startup;1'
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + 'manifest.json');
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ['content', 'zoteroner', rootURI + 'content/'],
  ]);
  log('chromeHandle registered.');

  // Load bundled core into an isolated scope so we can share it with Zotero windows
  zoteroNERScope = {
    Zotero,
    Components,
    Services,
    ChromeUtils,
    // Note: console is not available in Zotero 8 bootstrap scope, use Zotero.debug instead
  };

  if (typeof Cu !== 'undefined') {
    zoteroNERScope.Cu = Cu;
  }
  if (typeof Ci !== 'undefined') {
    zoteroNERScope.Ci = Ci;
  }
  if (typeof Cr !== 'undefined') {
    zoteroNERScope.Cr = Cr;
  }
  if (typeof Cc !== 'undefined') {
    zoteroNERScope.Cc = Cc;
  }

  Services.scriptloader.loadSubScript(
    `${rootURI}content/scripts/zotero-ner-bundled.js`,
    zoteroNERScope,
    'UTF-8',
  );
  log('zotero-ner-bundled.js loaded.');

  if (zoteroNERScope.ZoteroNER) {
    globalThis.ZoteroNER = zoteroNERScope.ZoteroNER;
    log('ZoteroNER exposed globally.');
    // Call custom onStartup hook
    if (globalThis.ZoteroNER.hooks && globalThis.ZoteroNER.hooks.onStartup) {
      globalThis.ZoteroNER.hooks.onStartup();
    }
  }

  registerWindowListeners(reason);

  // Load Mocha tests if test mode and test file exists
  if (Zotero.Prefs.get('extensions.zotero-ner.testMode')) {
    try {
      Services.scriptloader.loadSubScript(
        `${rootURI}tests/zotero-framework/test/tests/zotero-ner-test.js`,
        globalThis,
        'UTF-8'
      );
      Zotero.debug('NER Test: Loaded Mocha test file');
    } catch (e) {
      Zotero.debug('NER Test: Could not load test file: ' + e.message);
    }

    try {
      Services.scriptloader.loadSubScript(
        `${rootURI}tests/zotero-framework/test/tests/zotero-ner-ui-test.js`,
        globalThis,
        'UTF-8'
      );
      Zotero.debug('NER Test: Loaded UI test file');
    } catch (e) {
      Zotero.debug('NER Test: Could not load UI test file: ' + e.message);
    }
  }
}



function shutdown(data, reason) {
  // No longer using windowListener
  // Zotero calls onMainWindowUnload for each window
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }

  if (windowListener) {
    Services.wm.removeListener(windowListener);
  }

  // Ensure we clean up from all existing Zotero windows
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) {
    const win = enumerator.getNext();
    if (isZoteroMainWindow(win)) {
      onMainWindowUnload({ window: win }, reason);
    }
  }
}

/**
 * Run tests and exit Zotero
 */
function runTestsAndExit() {
  if (runTestsAndExit._started) {
    Zotero.debug('NER Test: runTestsAndExit already started; skipping');
    return;
  }
  runTestsAndExit._started = true;

  function getResultsPaths() {
    let configured;
    try {
      configured = Zotero.Prefs.get('extensions.zotero-ner.testResultsPath');
    } catch (e) {
      configured = null;
    }

    const base = configured || '/tmp/zotero-ner-test-results.json';
    const ui = configured ? configured.replace(/\.json$/i, '-ui.json') : '/tmp/zotero-ner-ui-results.json';
    const mocha = configured ? configured.replace(/\.json$/i, '-mocha.json') : '/tmp/zotero-ner-mocha-results.json';
    return { base, ui, mocha };
  }

  function ensureParentDir(filename) {
    try {
      const CcLocal = (typeof Cc !== 'undefined') ? Cc : Components.classes;
      const CiLocal = (typeof Ci !== 'undefined') ? Ci : Components.interfaces;

      const file = CcLocal['@mozilla.org/file/local;1'].createInstance(CiLocal.nsIFile);
      file.initWithPath(filename);
      const parent = file.parent;
      if (parent && !parent.exists()) {
        parent.create(CiLocal.nsIFile.DIRECTORY_TYPE, 0o755);
      }
    } catch (e) {
      // ignore
    }
  }

  function writeResults(results, filename) {
    try {
      const CcLocal = (typeof Cc !== 'undefined') ? Cc : Components.classes;
      const CiLocal = (typeof Ci !== 'undefined') ? Ci : Components.interfaces;

      ensureParentDir(filename);

      const file = CcLocal['@mozilla.org/file/local;1'].createInstance(CiLocal.nsIFile);
      file.initWithPath(filename);
      const stream = CcLocal['@mozilla.org/network/file-output-stream;1'].createInstance(CiLocal.nsIFileOutputStream);
      stream.init(file, 0x02 | 0x08 | 0x20, 0o644, 0);
      const content = JSON.stringify(results, null, 2);
      stream.write(content, content.length);
      stream.close();
      Zotero.debug('NER Test: Results written to ' + filename);
    } catch (e) {
      Zotero.debug('NER Test: Write error: ' + e.message);
    }
  }

  async function runTests() {
    const startTime = Date.now();
    const results = { passed: 0, failed: 0, timedOut: false, tests: [], timestamp: Date.now(), duration: 0 };

    function pass(name) {
      results.passed++;
      results.tests.push({ name: name, status: 'pass' });
      Zotero.debug('NER Test: PASS - ' + name);
    }

    function fail(name, error) {
      results.failed++;
      results.tests.push({ name: name, status: 'fail', error: error });
      Zotero.debug('NER Test: FAIL - ' + name + ': ' + error);
    }

    function assert(condition, name, error) {
      if (condition) pass(name); else fail(name, error || 'assertion failed');
    }

    Zotero.debug('NER Test: Starting tests...');
    Zotero.debug('NER Test: Zotero version = ' + Zotero.version);

    // Wait for Zotero initialization before any test suites
    try {
      if (Zotero.initializationPromise) {
        await Zotero.initializationPromise;
      }
    } catch (e) {
      Zotero.debug('NER Test: Zotero initialization wait failed: ' + e.message);
    }

    // Prefer Mocha suite when available
    if (typeof ZoteroNERMochaTests !== 'undefined' && ZoteroNERMochaTests.runTests) {
      Zotero.debug('NER Test: Running Mocha test suite...');
      try {
        const mochaResults = await ZoteroNERMochaTests.runTests();
        results.passed += mochaResults.passed || 0;
        results.failed += mochaResults.failed || 0;
        if (Array.isArray(mochaResults.tests)) {
          results.tests.push(...mochaResults.tests);
        }
      } catch (e) {
        Zotero.debug('NER Test: Mocha tests failed: ' + e.message);
        fail('Mocha suite: runTests', e.message);
      }
    } else {
      // Fallback to original tests
      Zotero.debug('NER Test: Running inline tests (Mocha tests not available)');

      // Test Zotero loaded
      assert(typeof Zotero !== 'undefined', 'Zotero defined');

      // Test Zotero.NER loaded
      assert(typeof Zotero.NER !== 'undefined', 'Zotero.NER defined');

      if (typeof Zotero.NER !== 'undefined') {
        // Test all modules present (use camelCase to match exports)
        var modules = ['nameParser', 'learningEngine', 'candidateFinder',
                       'nerProcessor', 'variantGenerator', 'menuIntegration', 'itemProcessor'];
        var allPresent = true;
        for (var i = 0; i < modules.length; i++) {
          if (!Zotero.NER[modules[i]]) {
            allPresent = false;
            Zotero.debug('NER Test: Missing module: ' + modules[i]);
          }
        }
        assert(allPresent, 'All modules present');

        // Test name parser
        if (Zotero.NER.nameParser) {
          var p = Zotero.NER.nameParser.parse('John Smith');
          assert(p.firstName === 'John', 'Name parser: firstName');
          assert(p.lastName === 'Smith', 'Name parser: lastName');
        }

        // Test learning engine
        if (Zotero.NER.learningEngine) {
          var testKey = 'Test_' + Date.now();
          Zotero.NER.learningEngine.storeMapping(testKey, 'TestValue', 0.9);
          var m = Zotero.NER.learningEngine.getMapping(testKey);
          assert(m !== null && m.normalized === 'TestValue', 'Learning engine: store/retrieve');
        }

        // Test candidate finder
        if (Zotero.NER.candidateFinder) {
          var c = Zotero.NER.candidateFinder.findPotentialVariants(['Smith', 'Smyth']);
          assert(Array.isArray(c) && c.length > 0, 'Candidate finder returns results');
        }

        // Test variant generator
        if (Zotero.NER.variantGenerator) {
          var v = Zotero.NER.variantGenerator.generateVariants('Smith');
          assert(Array.isArray(v) && v.length > 0, 'Variant generator returns results');
        }

        // Test NER processor
        if (Zotero.NER.nerProcessor) {
          var a = Zotero.NER.nerProcessor.extractAuthors('John Smith and Jane Doe');
          assert(Array.isArray(a), 'NER processor returns array');
        }
      }
    }

    // Run UI suite if available
    if (typeof ZoteroNERUITests !== 'undefined' && ZoteroNERUITests.runTests) {
      Zotero.debug('NER Test: Running UI test suite...');
      try {
        const uiResults = await ZoteroNERUITests.runTests();
        results.passed += uiResults.passed || 0;
        results.failed += uiResults.failed || 0;
        if (Array.isArray(uiResults.tests)) {
          results.tests.push(...uiResults.tests);
        }
      } catch (e) {
        Zotero.debug('NER Test: UI tests failed: ' + e.message);
        fail('UI suite: runTests', e.message);
      }
    } else {
      Zotero.debug('NER Test: UI tests not available');
    }

    Zotero.debug('NER Test: Complete - ' + results.passed + '/' + (results.passed + results.failed));

    results.duration = Date.now() - startTime;

    // Write results
    const paths = getResultsPaths();
    writeResults(results, paths.base);
    // Optional per-suite files for debugging
    try { writeResults({ suite: 'mocha', ...(typeof ZoteroNERMochaTests !== 'undefined' && ZoteroNERMochaTests.getResults ? ZoteroNERMochaTests.getResults() : {}) }, paths.mocha); } catch (e) {}
    try { writeResults({ suite: 'ui', ...(typeof ZoteroNERUITests !== 'undefined' && ZoteroNERUITests.getResults ? ZoteroNERUITests.getResults() : {}) }, paths.ui); } catch (e) {}

    // Exit Zotero - try multiple methods
    setTimeout(function() {
      Zotero.debug('NER Test: Exiting Zotero...');
      try {
        const CiLocal = (typeof Ci !== 'undefined') ? Ci : Components.interfaces;
        // Method 1: Try Services.startup.quit
        if (typeof Services !== 'undefined' && Services.startup && Services.startup.quit) {
          Services.startup.quit(CiLocal.nsIAppStartup.eForceQuit);
        }
      } catch (e) {
        Zotero.debug('NER Test: quit method 1 failed: ' + e.message);
      }
    }, 500);

    // Backup exit method - force quit after a delay
    setTimeout(function() {
      Zotero.debug('NER Test: Force exiting Zotero...');
      try {
        if (typeof Zotero !== 'undefined' && Zotero.quit) {
          Zotero.quit();
        }
      } catch(e) {
        Zotero.debug('NER Test: quit method 2 failed: ' + e.message);
      }
    }, 2000);
  }

  // Start tests after a short delay to allow window/UI initialization
  Zotero.debug('NER Author Name Normalizer: Test mode - scheduling tests');
  setTimeout(() => {
    runTests().catch(e => {
      Zotero.debug('NER Test: Unhandled test error: ' + (e && e.message ? e.message : e));
      const paths = getResultsPaths();
      writeResults({
        passed: 0,
        failed: 1,
        timedOut: false,
        tests: [{ name: 'Test Runner', status: 'fail', error: String(e && e.message ? e.message : e) }],
        timestamp: Date.now(),
        duration: 0,
      }, paths.base);
      try {
        if (typeof Zotero !== 'undefined' && Zotero.quit) {
          Zotero.quit();
        }
      } catch (quitError) {}
    });
  }, 1500);
}

async function onMainWindowLoad({ window }, _reason) {
  log('=== Entering onMainWindowLoad ===');
  log('onMainWindowLoad called for window: ' + (window ? window.location.href : 'unknown'));

  try {
    if (zoteroNERScope?.ZoteroNER) {
      window.ZoteroNER = zoteroNERScope.ZoteroNER;
      log('Shared ZoteroNER bundle with window.');
    } else {
      log('ZoteroNER bundle not available during onMainWindowLoad.');
    }
  } catch (shareError) {
    log('Failed to expose ZoteroNER to window - ' + shareError);
  }

  // Load zotero-ner.js into the window's scope
  Services.scriptloader.loadSubScript(
    `${registeredRootURI}content/scripts/zotero-ner.js`,
    window,
    'UTF-8',
  );

  if (window.Zotero?.NER?.hooks?.onMainWindowLoad) {
    log('Calling Zotero.NER.hooks.onMainWindowLoad.');
    window.Zotero.NER.hooks.onMainWindowLoad(window);
  }

  // In test mode, run tests and exit after main window loads
  if (Zotero.Prefs.get('extensions.zotero-ner.testMode')) {
    Zotero.debug('NER Author Name Normalizer: Test mode - running tests on main window load');
    // Run tests and exit
    runTestsAndExit();
  }
}

async function onMainWindowUnload({ window }, _reason) {
  log('onMainWindowUnload called for window: ' + (window ? window.location.href : 'unknown'));
  if (window.Zotero?.NER?.hooks?.onMainWindowUnload) {
    log('Calling Zotero.NER.hooks.onMainWindowUnload.');
    window.Zotero.NER.hooks.onMainWindowUnload(window);
  }
  // Clean up injected properties if necessary
  delete window.ZoteroNER;
  delete window.Zotero.__zoteroNERInjected; // Assuming this was used
}

function uninstall(_data, _reason) {}

function registerWindowListeners(reason) {
  if (!windowListener) {
    windowListener = {
      onOpenWindow(xulWindow) {
        const domWindow = getDOMWindowFromXUL(xulWindow);
        if (!domWindow) {
          return;
        }

        const onLoad = () => {
          domWindow.removeEventListener('load', onLoad);
          if (isZoteroMainWindow(domWindow)) {
            onMainWindowLoad({ window: domWindow }, reason);
          }
        };

        if (domWindow.document?.readyState === 'complete') {
          onLoad();
        } else {
          domWindow.addEventListener('load', onLoad, { once: true });
        }

        domWindow.addEventListener(
          'unload',
          function() {
            if (isZoteroMainWindow(domWindow)) {
              onMainWindowUnload({ window: domWindow }, reason);
            }
          },
          { once: true },
        );
      },
      onCloseWindow(xulWindow) {
        const domWindow = getDOMWindowFromXUL(xulWindow);
        if (domWindow && isZoteroMainWindow(domWindow)) {
          onMainWindowUnload({ window: domWindow }, reason);
        }
      },
      onWindowTitleChange() {},
    };
  }

  Services.wm.addListener(windowListener);

  // Handle already open Zotero windows
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) {
    const win = enumerator.getNext();
    if (!isZoteroMainWindow(win)) {
      continue;
    }

    if (win.document?.readyState === 'complete') {
      onMainWindowLoad({ window: win }, reason);
    } else {
      win.addEventListener(
        'load',
        function onLoad() {
          win.removeEventListener('load', onLoad);
          onMainWindowLoad({ window: win }, reason);
        },
        { once: true },
      );
    }
  }
}

function getDOMWindowFromXUL(xulWindow) {
  try {
    return xulWindow
      .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindow);
  } catch (err) {
    Zotero.debug('NER Author Name Normalizer: Failed to resolve DOM window - ' + err);
    return null;
  }
}

function isZoteroMainWindow(win) {
  if (!win || !win.document) {
    return false;
  }

  const windowType = win.document.documentElement.getAttribute('windowtype');
  return windowType === 'navigator:browser' || windowType === 'zotero:browser';
}

// Export test runner functions for use by test harness
if (typeof globalThis !== 'undefined') {
  globalThis.ZoteroNERTests = {
    /**
     * Run a test and return result
     * @param {string} testName - Name of the test to run
     * @returns {Object} Test result
     */
    runTest: function(testName) {
      if (typeof Zotero === 'undefined' || !Zotero.NER) {
        return { success: false, error: 'Zotero or Zotero.NER not available' };
      }

      try {
        switch (testName) {
          case 'testZoteroLoaded':
            return {
              success: typeof Zotero !== 'undefined',
              version: Zotero.version,
              message: 'Zotero is loaded'
            };

          case 'testExtensionLoaded':
            const loaded = typeof Zotero !== 'undefined' && Zotero.NER;
            return {
              success: loaded,
              initialized: loaded ? Zotero.NER.initialized : false,
              message: loaded ? 'Extension is loaded' : 'Zotero.NER not defined'
            };

          case 'testLearningEngine':
            if (!Zotero.NER.learningEngine) {
              return { success: false, error: 'Learning engine not initialized' };
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

          case 'testNameParser':
            if (!Zotero.NER.nameParser) {
              return { success: false, error: 'Name parser not initialized' };
            }
            const testCases = [
              { input: 'John Smith', expected: { firstName: 'John', lastName: 'Smith' } },
              { input: 'J. Smith', expected: { firstName: 'J.', lastName: 'Smith' } }
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
            return {
              success: allPassed,
              results: results,
              message: allPassed ? 'All name parsing tests passed' : 'Some tests failed'
            };

          case 'testCandidateFinder':
            if (!Zotero.NER.candidateFinder) {
              return { success: false, error: 'Candidate finder not initialized' };
            }
            const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
            const candidates = Zotero.NER.candidateFinder.findPotentialVariants(surnames);
            return {
              success: candidates && candidates.length > 0,
              candidateCount: candidates ? candidates.length : 0,
              candidates: candidates
            };

          case 'testDBAnalyzer':
            if (!Zotero.NER.menuIntegration) {
              return { success: false, error: 'Menu integration not initialized' };
            }
            const dbAnalyzer = Zotero.NER.menuIntegration.zoteroDBAnalyzer;
            return {
              success: !!dbAnalyzer,
              hasDBAnalyzer: !!dbAnalyzer,
              message: dbAnalyzer ? 'DB analyzer available' : 'DB analyzer not available'
            };

          case 'testLibraryAccess':
            if (typeof Zotero === 'undefined' || !Zotero.Libraries) {
              return { success: false, error: 'Zotero Libraries not available' };
            }
            const userLibraryID = Zotero.Libraries.userLibraryID;
            const hasAccess = typeof userLibraryID === 'number';
            return {
              success: hasAccess,
              libraryID: userLibraryID,
              message: hasAccess ? 'Library access confirmed' : 'No library access'
            };

          default:
            return { success: false, error: 'Unknown test: ' + testName };
        }
      } catch (e) {
        return { success: false, error: e.message, stack: e.stack };
      }
    },

    /**
     * Run all tests and return results
     * @returns {Object} All test results
     */
    runAllTests: function() {
      const testNames = [
        'testZoteroLoaded',
        'testExtensionLoaded',
        'testLearningEngine',
        'testNameParser',
        'testCandidateFinder',
        'testDBAnalyzer',
        'testLibraryAccess'
      ];

      const results = {};
      for (const testName of testNames) {
        results[testName] = this.runTest(testName);
      }

      const passed = Object.values(results).filter(r => r.success).length;
      const failed = Object.values(results).filter(r => !r.success).length;

      return {
        tests: results,
        passed: passed,
        failed: failed,
        total: testNames.length
      };
    }
  };
}