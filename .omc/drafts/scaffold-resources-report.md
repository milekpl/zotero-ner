# Scaffold Test Resources Documentation

## Overview
The `.scaffold/test/resource/` directory contains test framework files provided by `zotero-plugin-scaffold` package. These are part of scaffold's own testing infrastructure and are NOT used by our custom test suite.

## Files Catalog

| File | Purpose | Used By Our Tests |
|-------|---------|-------------------|
| `bootstrap.js` | Test runner bootstrap - handles addon lifecycle, launches tests, posts to localhost:33339/update | **NO** |
| `manifest.json` | MV2 manifest for scaffold test runner plugin | **NO** |
| `content/chai.js` | Chai assertion library | **NO** |
| `content/mocha.js` | Mocha test framework | **NO** |
| `content/units/zotero-ner.test.js` | Sample scaffold test | **NO** |

## Test Framework Architecture

The scaffold provides a COMPLETELY SEPARATE test framework:

```
.scaffold/test/
├── bootstrap.js (lifecycle manager + test launcher)
└── content/
    ├── index.xhtml (test runner page)
    └── units/
        └── zotero-ner.test.js (sample tests)
```

**This framework:**
- Opens a test.xhtml page in Zotero
- Loads Chai and Mocha from content/
- Runs tests via `chrome://zotero-plugin-scaffold-test-runner/content/index.xhtml`
- Posts results to `localhost:33339/update` (SEPARATE reporting mechanism)

## Our Test Architecture

Our tests use a DIFFERENT framework:

```
tests/zotero-framework/
├── run-zotero-tests.js (our test runner)
└── test/tests/
    ├── zotero-ner.spec.js (main tests)
    ├── zotero-ner-ui.spec.js (UI tests)
    ├── integration.spec.js (integration tests)
    ├── 00-fixtures.spec.js (fixtures)
    ├── debug-analyzer.spec.js (debug tests)
    └── test-and-friston.js (and more...)
```

**This framework:**
- Uses Mocha directly (via `entries` config in package.json)
- Tests are loaded by zotero-plugin test runner
- Results output via standard test runner output
- NO communication with localhost:33339/update

## Integration Analysis

### Are Scaffold Resources Used?

**NO.** The scaffold resources are part of a different testing system:

| Aspect | Scaffold | Our Tests |
|--------|----------|-------------|
| Entry point | `bootstrap.js` → opens test.xhtml | `zotero-plugin test` → loads `.spec.js` files |
| Test location | `content/units/` | `tests/zotero-framework/test/tests/` |
| Reporting | Posts to `localhost:33339/update` | Standard test runner output |
| Dependencies | Chai/Mocha from content/ | Chai/Mocha from node_modules |

### Do They Conflict?

**NO.** The two systems operate independently:
- Scaffold framework: Runs its own sample tests
- Our framework: Runs our custom tests

The scaffold `bootstrap.js` posting to `localhost:33339/update` is part of scaffold's internal reporting and does NOT interfere with our tests.

## Recommendation

**Keep scaffold resources intact.** Reasons:

1. **No Harm** - They're not used by our tests, no performance impact
2. **Future Compatibility** - Scaffold may add new features we might want later
3. **Minimal Size** - Only ~150KB of JS files (chai.js, mocha.js, bootstrap.js)
4. **Standard Practice** - Node modules commonly include their test infrastructure

### Cleanup Options

If cleanup is desired, options are:

| Option | Description | Effort |
|---------|-------------|---------|
| Remove entire `.scaffold/` | Deletes all scaffold resources | Low |
| Keep for future use | No action needed | None |
| Move to `vendor/` or similar | Rename for clarity | Medium |

## Conclusion

The scaffold test resources are part of `zotero-plugin-scaffold` package's own testing framework. They are NOT used by our custom test suite and do NOT interfere with our tests. No action required.

---
*Generated: 2026-02-03*
