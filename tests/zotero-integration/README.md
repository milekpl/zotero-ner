# Zotero Integration Testing - Findings and Approaches

This document summarizes our exploration of testing the Zotero NER extension within Zotero's actual JavaScript context.

## Current Test Status

- **Unit Tests**: 197 tests passing (`npm run test:unit`)
- **Test Runner**: Available via `ZoteroNERTests` global in Zotero console
- **Zotero Source Framework**: Requires cloning Zotero source repository

## Quick: Run Tests in Zotero Console

The easiest way to test the extension in Zotero's actual context:

1. Install the extension (build with `npm run build`, install .xpi)
2. Open Zotero
3. Open Developer Tools (Ctrl+Shift+I or Cmd+Option+I)
4. Switch to **Console** tab
5. Run:
   ```javascript
   // Run all tests
   ZoteroNERTests.runAllTests()

   // Run specific test
   ZoteroNERTests.runTest('testExtensionLoaded')
   ZoteroNERTests.runTest('testLearningEngine')
   ZoteroNERTests.runTest('testNameParser')
   ```

## Zotero's Built-in Test Framework (For Full E2E)

Zotero has a **dedicated Mocha-based testing framework** that runs tests inside an actual Zotero instance:

```bash
# Run all tests (from Zotero source directory)
./test/runtests.sh

# Run specific test
./test/runtests.sh -test pluginAPITest

# Filter by pattern
./test/runtests.sh -grep "author"

# Stop on first failure
./test/runtests.sh -f

# Keep console open for inspection
./test/runtests.sh -c
```

**Key flags:**
- `-ZoteroTest` - Enables test mode
- `-test TESTS` - Run specific tests
- `-grep PATTERN` - Filter tests by pattern
- `-bail` - Stop after first failure
- `-c` - Open JavaScript console, don't quit
- `-x /path/to/zotero` - Specify Zotero executable

The framework uses:
- **Mocha** for test structure
- **Chai** for assertions
- **Sinon** for mocking
- `dump()` for output (goes to stdout)

## Approaches That Don't Work

### 1. Zotero's `-js` Flag (Standalone)

**Attempted:**
```bash
zotero -js "dump('TEST_OUTPUT\n');"
zotero -js /path/to/test.js
```

**Result:** JavaScript executes, but `dump()` output and file writes via `nsIFileOutputStream` are not captured or don't work in this mode.

**Why:** The `-js` flag runs code in a headless context where stdout capture doesn't work properly.

## Approaches That COULD Work (Not Fully Tested)

### 1. Remote Debugging Protocol

Zotero supports Firefox remote debugging on port 32000:
```bash
zotero --jsdebugger
# Then connect via CDP (Chrome DevTools Protocol)
```

This would allow:
- Evaluating JavaScript in Zotero's context
- Reading results via CDP
- Full debugging capabilities

Requires setting up a CDP client or using Puppeteer/Playwright's CDP connection.

### 2. Custom Test Extension

Create a dedicated test extension that:
- Has a UI to run tests
- Writes results to a file
- Can be triggered via menu or keyboard shortcut

Example test runner exported from `bootstrap.js`:
```javascript
globalThis.ZoteroNERTests = {
  runTest: (name) => { /* ... */ },
  runAllTests: () => { /* ... */ }
};
```

### 3. Zotero's Internal Test Framework

Zotero may have its own testing infrastructure. Check:
- `chrome://zotero/content/tests/`
- Zotero source code for testing patterns

### 4. Window Message Passing

From within Zotero's JavaScript console:
```javascript
// In Zotero console
ZoteroNERTests.runAllTests();
// Results available in browser console
```

### 5. HTTP API for External Control

Zotero includes a local HTTP API server (port 23124) for external control:
```javascript
// In test setup
user_pref("extensions.zotero.httpServer.enabled", true);
user_pref("extensions.zotero.httpServer.port", 23124);
```

This allows external scripts to query Zotero's state and trigger operations via HTTP requests.

### 6. CI/Headless Execution

For automated testing, Zotero can run headlessly using xvfb:
```bash
xvfb-run test/runtests.sh -f
```

## Current Test Runner Exports

The extension exports `ZoteroNERTests` in `bootstrap.js` with these methods:

- `runTest(testName)` - Run single test, returns `{success, ...}`
- `runAllTests()` - Run all tests, returns `{tests, passed, failed, total}`

Available tests:
- `testZoteroLoaded` - Zotero is defined
- `testExtensionLoaded` - Zotero.NER is defined and initialized
- `testLearningEngine` - Learning engine stores/retrieves mappings
- `testNameParser` - Name parser correctly parses names
- `testCandidateFinder` - Candidate finder finds variants
- `testDBAnalyzer` - DB analyzer is available
- `testLibraryAccess` - Zotero.Libraries is accessible

## Recommendations

1. **For CI/CD**: Use Jest unit tests (`npm run test:unit`)
2. **For quick manual testing**: Open Zotero's browser console and call:
   ```javascript
   ZoteroNERTests.runAllTests()
   ```
3. **For full integration tests with Zotero source**: Clone Zotero repo and use Mocha framework

## Writing Zotero-Style Extension Tests

To add proper E2E tests, create a test file following Zotero's patterns:

```javascript
// test/tests/zoteroNerTest.js
describe("Zotero NER Extension", function () {
    var win, doc, ZoteroPane;

    before(async function () {
        win = await loadZoteroPane();
        doc = win.document;
        ZoteroPane = win.ZoteroPane;
    });

    describe("Name Normalization", function () {
        it("should normalize author names", async function () {
            var items = await Zotero.Items.getAll();
            var item = items[0];
            var creators = item.getCreators();
            var normalized = Zotero.NER.nameParser.parse("J. Smith");
            assert.equal(normalized.lastName, "Smith");
        });
    });

    describe("Learning Engine", function () {
        it("should store and retrieve name mappings", async function () {
            Zotero.NER.learningEngine.storeMapping("Smyth", "Smith", 0.9);
            var mapping = Zotero.NER.learningEngine.getMapping("Smyth");
            assert.equal(mapping.normalized, "Smith");
        });
    });
});
```

Run with:
```bash
./test/runtests.sh -test zoteroNerTest -x /Applications/Zotero.app/Contents/MacOS/zotero
```

## Files in This Directory

```
tests/zotero-integration/
├── README.md                    # This file
├── index.js                     # Verification script
├── profile/
│   └── prefs.js                 # Test profile preferences
├── run-tests.js                 # Original test runner attempt
├── run-tests-playwright.js      # Playwright-based runner attempt
└── run-tests-simple.js          # Simple runner with Zotero.quit()
```
