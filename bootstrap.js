/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Bootstrap file for Zotero Name Normalizer Extension
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
var zoteroNameNormalizerScope;
var registeredRootURI;

// Console polyfill for Zotero 8 - console not available in bootstrap scope
// Use Zotero.debug instead
function log(message) {
  if (typeof Zotero !== 'undefined' && Zotero.debug) {
    Zotero.debug('Name Normalizer: ' + message);
  }
}

function install(_data, _reason) {}

async function startup({ resourceURI, rootURI }, reason) {
  Zotero.debug('Name Normalizer: startup called');
  await Zotero.initializationPromise;
  Zotero.debug('Name Normalizer: Zotero initializationPromise resolved.');

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
    ['content', 'zoteronamenormalizer', rootURI + 'content/'],
  ]);
  log('chromeHandle registered.');

  // Load bundled core into an isolated scope so we can share it with Zotero windows
  zoteroNameNormalizerScope = {
    Zotero,
    Components,
    Services,
    ChromeUtils,
    // Note: console is not available in Zotero 8 bootstrap scope, use Zotero.debug instead
  };

  if (typeof Cu !== 'undefined') {
    zoteroNameNormalizerScope.Cu = Cu;
  }
  if (typeof Ci !== 'undefined') {
    zoteroNameNormalizerScope.Ci = Ci;
  }
  if (typeof Cr !== 'undefined') {
    zoteroNameNormalizerScope.Cr = Cr;
  }
  if (typeof Cc !== 'undefined') {
    zoteroNameNormalizerScope.Cc = Cc;
  }

  // Expose scope as global for the bundled script to use in its footer
  globalThis.__zotero_scope__ = zoteroNameNormalizerScope;

  Services.scriptloader.loadSubScript(
    `${rootURI}content/scripts/zotero-ner-bundled.js`,
    zoteroNameNormalizerScope,
    'UTF-8',
  );
  log('zotero-ner-bundled.js loaded.');

  // Debug: check what's in the scope
  const scopeKeys = Object.keys(zoteroNameNormalizerScope);
  log('Scope has ' + scopeKeys.length + ' properties');
  log('ZoteroNameNormalizer in scope: ' + (zoteroNameNormalizerScope.ZoteroNameNormalizer ? 'YES' : 'NO'));

  if (zoteroNameNormalizerScope.ZoteroNameNormalizer) {
    globalThis.ZoteroNameNormalizer = zoteroNameNormalizerScope.ZoteroNameNormalizer;
    log('ZoteroNameNormalizer exposed globally.');
    // Call custom onStartup hook
    if (globalThis.ZoteroNameNormalizer.hooks && globalThis.ZoteroNameNormalizer.hooks.onStartup) {
      globalThis.ZoteroNameNormalizer.hooks.onStartup();
    }
  } else {
    log('ERROR: ZoteroNameNormalizer NOT found in scope after loading bundled script!');
  }

  registerWindowListeners(reason);

  // Load Mocha tests if test mode and test file exists
  if (Zotero.Prefs.get('extensions.zotero-name-normalizer.testMode')) {
    try {
      Services.scriptloader.loadSubScript(
        `${rootURI}tests/zotero-framework/test/tests/zotero-name-normalizer-test.js`,
        globalThis,
        'UTF-8'
      );
      Zotero.debug('Name Normalizer Test: Loaded Mocha test file');
    } catch (e) {
      Zotero.debug('Name Normalizer Test: Could not load test file: ' + e.message);
    }

    try {
      Services.scriptloader.loadSubScript(
        `${rootURI}tests/zotero-framework/test/tests/zotero-name-normalizer-ui-test.js`,
        globalThis,
        'UTF-8'
      );
      Zotero.debug('Name Normalizer Test: Loaded UI test file');
    } catch (e) {
      Zotero.debug('Name Normalizer Test: Could not load UI test file: ' + e.message);
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
    Zotero.debug('Name Normalizer Test: runTestsAndExit already started; skipping');
    return;
  }
  runTestsAndExit._started = true;

  function getResultsPaths() {
    let configured;
    try {
      configured = Zotero.Prefs.get('extensions.zotero-name-normalizer.testResultsPath');
    } catch (e) {
      configured = null;
    }

    const base = configured || '/tmp/zotero-name-normalizer-test-results.json';
    const ui = configured ? configured.replace(/\.json$/i, '-ui.json') : '/tmp/zotero-name-normalizer-ui-results.json';
    const mocha = configured ? configured.replace(/\.json$/i, '-mocha.json') : '/tmp/zotero-name-normalizer-mocha-results.json';
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
      Zotero.debug('Name Normalizer Test: Results written to ' + filename);
    } catch (e) {
      Zotero.debug('Name Normalizer Test: Write error: ' + e.message);
    }
  }

  async function runTests() {
    const startTime = Date.now();
    const results = { passed: 0, failed: 0, timedOut: false, tests: [], timestamp: Date.now(), duration: 0 };

    function pass(name) {
      results.passed++;
      results.tests.push({ name: name, status: 'pass' });
      Zotero.debug('Name Normalizer Test: PASS - ' + name);
    }

    function fail(name, error) {
      results.failed++;
      results.tests.push({ name: name, status: 'fail', error: error });
      Zotero.debug('Name Normalizer Test: FAIL - ' + name + ': ' + error);
    }

    function assert(condition, name, error) {
      if (condition) pass(name); else fail(name, error || 'assertion failed');
    }

    Zotero.debug('Name Normalizer Test: Starting tests...');
    Zotero.debug('Name Normalizer Test: Zotero version = ' + Zotero.version);

    // Wait for Zotero initialization before any test suites
    try {
      if (Zotero.initializationPromise) {
        await Zotero.initializationPromise;
      }
    } catch (e) {
      Zotero.debug('Name Normalizer Test: Zotero initialization wait failed: ' + e.message);
    }

    // Prefer Mocha suite when available
    if (typeof ZoteroNameNormalizerMochaTests !== 'undefined' && ZoteroNameNormalizerMochaTests.runTests) {
      Zotero.debug('Name Normalizer Test: Running Mocha test suite...');
      try {
        const mochaResults = await ZoteroNameNormalizerMochaTests.runTests();
        results.passed += mochaResults.passed || 0;
        results.failed += mochaResults.failed || 0;
        if (Array.isArray(mochaResults.tests)) {
          results.tests.push(...mochaResults.tests);
        }
      } catch (e) {
        Zotero.debug('Name Normalizer Test: Mocha tests failed: ' + e.message);
        fail('Mocha suite: runTests', e.message);
      }
    } else {
      // Fallback to original tests
      Zotero.debug('Name Normalizer Test: Running inline tests (Mocha tests not available)');

      // Test Zotero loaded
      assert(typeof Zotero !== 'undefined', 'Zotero defined');

      // Test Zotero.NameNormalizer loaded
      assert(typeof Zotero.NameNormalizer !== 'undefined', 'Zotero.NameNormalizer defined');

      if (typeof Zotero.NameNormalizer !== 'undefined') {
        // Test all modules present
        var modules = ['nameParser', 'learningEngine', 'candidateFinder',
                       'variantGenerator', 'menuIntegration', 'itemProcessor'];
        var allPresent = true;
        for (var i = 0; i < modules.length; i++) {
          if (!Zotero.NameNormalizer[modules[i]]) {
            allPresent = false;
            Zotero.debug('Name Normalizer Test: Missing module: ' + modules[i]);
          }
        }
        assert(allPresent, 'All modules present');

        // Test name parser
        if (Zotero.NameNormalizer.nameParser) {
          var p = Zotero.NameNormalizer.nameParser.parse('John Smith');
          assert(p.firstName === 'John', 'Name parser: firstName');
          assert(p.lastName === 'Smith', 'Name parser: lastName');
        }

        // Test learning engine
        if (Zotero.NameNormalizer.learningEngine) {
          var testKey = 'Test_' + Date.now();
          Zotero.NameNormalizer.learningEngine.storeMapping(testKey, 'TestValue', 0.9);
          var m = Zotero.NameNormalizer.learningEngine.getMappingDetails(testKey);
          assert(m !== null && m.normalized === 'TestValue', 'Learning engine: store/retrieve');
        }

        // Test candidate finder
        if (Zotero.NameNormalizer.candidateFinder) {
          var c = Zotero.NameNormalizer.candidateFinder.findPotentialVariants(['Smith', 'Smyth']);
          assert(Array.isArray(c) && c.length > 0, 'Candidate finder returns results');
        }

        // Test variant generator
        if (Zotero.NameNormalizer.variantGenerator) {
          var v = Zotero.NameNormalizer.variantGenerator.generateVariants('Smith');
          assert(Array.isArray(v) && v.length > 0, 'Variant generator returns results');
        }
      }
    }

    // Run UI suite if available
    if (typeof ZoteroNameNormalizerUITests !== 'undefined' && ZoteroNameNormalizerUITests.runTests) {
      Zotero.debug('Name Normalizer Test: Running UI test suite...');
      try {
        const uiResults = await ZoteroNameNormalizerUITests.runTests();
        results.passed += uiResults.passed || 0;
        results.failed += uiResults.failed || 0;
        if (Array.isArray(uiResults.tests)) {
          results.tests.push(...uiResults.tests);
        }
      } catch (e) {
        Zotero.debug('Name Normalizer Test: UI tests failed: ' + e.message);
        fail('UI suite: runTests', e.message);
      }
    } else {
      Zotero.debug('Name Normalizer Test: UI tests not available');
    }

    Zotero.debug('Name Normalizer Test: Complete - ' + results.passed + '/' + (results.passed + results.failed));

    results.duration = Date.now() - startTime;

    // Write results
    const paths = getResultsPaths();
    writeResults(results, paths.base);
    // Optional per-suite files for debugging
    try { writeResults({ suite: 'mocha', ...(typeof ZoteroNameNormalizerMochaTests !== 'undefined' && ZoteroNameNormalizerMochaTests.getResults ? ZoteroNameNormalizerMochaTests.getResults() : {}) }, paths.mocha); } catch (e) {}
    try { writeResults({ suite: 'ui', ...(typeof ZoteroNameNormalizerUITests !== 'undefined' && ZoteroNameNormalizerUITests.getResults ? ZoteroNameNormalizerUITests.getResults() : {}) }, paths.ui); } catch (e) {}

    // Exit Zotero - try multiple methods
    setTimeout(function() {
      Zotero.debug('Name Normalizer Test: Exiting Zotero...');
      try {
        const CiLocal = (typeof Ci !== 'undefined') ? Ci : Components.interfaces;
        // Method 1: Try Services.startup.quit
        if (typeof Services !== 'undefined' && Services.startup && Services.startup.quit) {
          Services.startup.quit(CiLocal.nsIAppStartup.eForceQuit);
        }
      } catch (e) {
        Zotero.debug('Name Normalizer Test: quit method 1 failed: ' + e.message);
      }
    }, 500);

    // Backup exit method - force quit after a delay
    setTimeout(function() {
      Zotero.debug('Name Normalizer Test: Force exiting Zotero...');
      try {
        if (typeof Zotero !== 'undefined' && Zotero.quit) {
          Zotero.quit();
        }
      } catch(e) {
        Zotero.debug('Name Normalizer Test: quit method 2 failed: ' + e.message);
      }
    }, 2000);
  }

  // Start tests after a short delay to allow window/UI initialization
  Zotero.debug('Name Normalizer: Test mode - scheduling tests');
  setTimeout(() => {
    runTests().catch(e => {
      Zotero.debug('Name Normalizer Test: Unhandled test error: ' + (e && e.message ? e.message : e));
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
    log('onMainWindowLoad: zoteroNameNormalizerScope exists: ' + (!!zoteroNameNormalizerScope));
    log('onMainWindowLoad: ZoteroNameNormalizer in scope: ' + (zoteroNameNormalizerScope?.ZoteroNameNormalizer ? 'YES' : 'NO'));
    if (zoteroNameNormalizerScope?.ZoteroNameNormalizer) {
      window.ZoteroNameNormalizer = zoteroNameNormalizerScope.ZoteroNameNormalizer;
      log('Shared ZoteroNameNormalizer bundle with window.');
    } else {
      log('ZoteroNameNormalizer bundle not available during onMainWindowLoad.');
    }
  } catch (shareError) {
    log('Failed to expose ZoteroNameNormalizer to window - ' + shareError);
  }

  // Load zotero-name-normalizer.js into the window's scope
  Services.scriptloader.loadSubScript(
    `${registeredRootURI}content/scripts/zotero-ner.js`,
    window,
    'UTF-8',
  );

  if (window.Zotero?.NameNormalizer?.hooks?.onMainWindowLoad) {
    log('Calling Zotero.NameNormalizer.hooks.onMainWindowLoad.');
    window.Zotero.NameNormalizer.hooks.onMainWindowLoad(window);
  }

  // In test mode, run tests and exit after main window loads
  if (Zotero.Prefs.get('extensions.zotero-name-normalizer.testMode')) {
    Zotero.debug('Name Normalizer: Test mode - running tests on main window load');
    // Run tests and exit
    runTestsAndExit();
  }
}

async function onMainWindowUnload({ window }, _reason) {
  log('onMainWindowUnload called for window: ' + (window ? window.location.href : 'unknown'));
  if (window.Zotero?.NameNormalizer?.hooks?.onMainWindowUnload) {
    log('Calling Zotero.NameNormalizer.hooks.onMainWindowUnload.');
    window.Zotero.NameNormalizer.hooks.onMainWindowUnload(window);
  }
  // Clean up injected properties if necessary
  delete window.ZoteroNameNormalizer;
  delete window.Zotero.__zoteroNameNormalizerInjected;
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
    Zotero.debug('Name Normalizer: Failed to resolve DOM window - ' + err);
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
  globalThis.ZoteroNameNormalizerTests = {
    /**
     * Run a test and return result
     * @param {string} testName - Name of the test to run
     * @returns {Object} Test result
     */
    runTest: function(testName) {
      if (typeof Zotero === 'undefined' || !Zotero.NameNormalizer) {
        return { success: false, error: 'Zotero or Zotero.NameNormalizer not available' };
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
            const loaded = typeof Zotero !== 'undefined' && Zotero.NameNormalizer;
            return {
              success: loaded,
              initialized: loaded ? Zotero.NameNormalizer.initialized : false,
              message: loaded ? 'Extension is loaded' : 'Zotero.NameNormalizer not defined'
            };

          case 'testLearningEngine':
            if (!Zotero.NameNormalizer.learningEngine) {
              return { success: false, error: 'Learning engine not initialized' };
            }
            // Test storing and retrieving a mapping
            Zotero.NameNormalizer.learningEngine.storeMapping('Smyth', 'Smith', 0.9);
            const mappings = Zotero.NameNormalizer.learningEngine.getMapping('Smyth');
            const success = mappings && mappings.normalized === 'Smith';
            return {
              success: success,
              message: success ? 'Learning engine working' : 'Mapping not found',
              mappings: mappings
            };

          case 'testNameParser':
            if (!Zotero.NameNormalizer.nameParser) {
              return { success: false, error: 'Name parser not initialized' };
            }
            const testCases = [
              { input: 'John Smith', expected: { firstName: 'John', lastName: 'Smith' } },
              { input: 'J. Smith', expected: { firstName: 'J.', lastName: 'Smith' } }
            ];
            const results = testCases.map(tc => {
              const parsed = Zotero.NameNormalizer.nameParser.parse(tc.input);
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
            if (!Zotero.NameNormalizer.candidateFinder) {
              return { success: false, error: 'Candidate finder not initialized' };
            }
            const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
            const candidates = Zotero.NameNormalizer.candidateFinder.findPotentialVariants(surnames);
            return {
              success: candidates && candidates.length > 0,
              candidateCount: candidates ? candidates.length : 0,
              candidates: candidates
            };

          case 'testDBAnalyzer':
            if (!Zotero.NameNormalizer.menuIntegration) {
              return { success: false, error: 'Menu integration not initialized' };
            }
            const dbAnalyzer = Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer;
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
