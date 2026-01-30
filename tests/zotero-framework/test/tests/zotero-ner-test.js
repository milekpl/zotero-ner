/**
 * Zotero NER Test Suite
 *
 * Simple test harness for Zotero Name Normalizer extension
 */

// Results object
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    timestamp: Date.now()
};

function pass(name) {
    testResults.passed++;
    testResults.tests.push({ name, status: 'pass' });
    Zotero.debug('[PASS] ' + name);
}

function fail(name, error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'fail', error: String(error) });
    Zotero.debug('[FAIL] ' + name + ': ' + error);
}

function assert(condition, name, error) {
    if (condition) {
        pass(name);
    } else {
        fail(name, error || 'assertion failed');
    }
}

// Run tests
async function runTests() {
    Zotero.debug('NER Test: Starting test suite...');
    Zotero.debug('NER Test: Zotero version = ' + Zotero.version);

    await Zotero.initializationPromise;
    Zotero.debug('NER Test: Zotero initialized');

    // ============ Extension Loading Tests ============
    Zotero.debug('\n=== Extension Loading Tests ===');

    assert(typeof Zotero !== 'undefined', 'Zotero is defined');
    assert(typeof Zotero.NameNormalizer !== 'undefined', 'Zotero.NameNormalizer is defined');
    assert(Zotero.NameNormalizer.initialized === true, 'Extension initialized');
    assert(typeof ZoteroNameNormalizer !== 'undefined', 'ZoteroNameNormalizer bundle available');

    // ============ ZoteroDBAnalyzer Tests ============
    Zotero.debug('\n=== ZoteroDBAnalyzer Tests ===');

    assert(
        ZoteroNameNormalizer && ZoteroNameNormalizer.ZoteroDBAnalyzer,
        'ZoteroDBAnalyzer is in bundle'
    );

    // ============ Name Parser Tests ============
    Zotero.debug('\n=== Name Parser Tests ===');

    if (Zotero.NameNormalizer.nameParser) {
        const testCases = [
            { input: 'John Smith', expected: { firstName: 'John', lastName: 'Smith' } },
            { input: 'J. Smith', expected: { firstName: 'J.', lastName: 'Smith' } },
            { input: 'Smith, John', expected: { firstName: 'John', lastName: 'Smith' } },
            { input: 'de la Vega, Sancho', expected: { firstName: 'Sancho', lastName: 'de la Vega' } },
        ];

        for (const tc of testCases) {
            try {
                const parsed = Zotero.NameNormalizer.nameParser.parse(tc.input);
                const matches = parsed.lastName === tc.expected.lastName && parsed.firstName === tc.expected.firstName;
                assert(matches, `Name parser: "${tc.input}"`,
                    matches ? null : `Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(parsed)}`);
            } catch (e) {
                fail(`Name parser: "${tc.input}"`, e.message);
            }
        }
    } else {
        fail('Name parser tests', 'nameParser not available');
    }

    // ============ Learning Engine Tests ============
    Zotero.debug('\n=== Learning Engine Tests ===');

    if (Zotero.NameNormalizer.learningEngine) {
        try {
            const testKey = 'Test_NER_' + Date.now();
            Zotero.NameNormalizer.learningEngine.storeMapping(testKey, 'TestValue', 0.95);
            const mapping = Zotero.NameNormalizer.learningEngine.getMapping(testKey);
            assert(mapping !== null, 'Learning engine: store/retrieve mapping');
            if (mapping) {
                assert(mapping.normalized === 'TestValue', 'Learning engine: normalized value correct');
            }
        } catch (e) {
            fail('Learning engine: store/retrieve', e.message);
        }

        try {
            Zotero.NameNormalizer.learningEngine.storeMapping('Smyth', 'Smith', 0.92);
            const m = Zotero.NameNormalizer.learningEngine.getMapping('Smyth');
            assert(m && m.normalized === 'Smith', 'Learning engine: variant mapping');
        } catch (e) {
            fail('Learning engine: variant mapping', e.message);
        }
    } else {
        fail('Learning engine tests', 'learningEngine not available');
    }

    // ============ Variant Generator Tests ============
    Zotero.debug('\n=== Variant Generator Tests ===');

    if (Zotero.NameNormalizer.variantGenerator) {
        try {
            const variants = Zotero.NameNormalizer.variantGenerator.generateVariants('Smith');
            assert(Array.isArray(variants), 'Variant generator returns array');
            assert(variants.length > 0, 'Variant generator returns results');
        } catch (e) {
            fail('Variant generator', e.message);
        }
    } else {
        fail('Variant generator tests', 'variantGenerator not available');
    }

    // ============ Candidate Finder Tests ============
    Zotero.debug('\n=== Candidate Finder Tests ===');

    if (Zotero.NameNormalizer.candidateFinder) {
        try {
            const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
            const candidates = Zotero.NameNormalizer.candidateFinder.findPotentialVariants(surnames);
            assert(Array.isArray(candidates), 'Candidate finder returns array');
            assert(candidates && candidates.length > 0, 'Candidate finder returns results');
        } catch (e) {
            fail('Candidate finder', e.message);
        }
    } else {
        fail('Candidate finder tests', 'candidateFinder not available');
    }

    // ============ Menu Integration Tests ============
    Zotero.debug('\n=== Menu Integration Tests ===');

    assert(
        Zotero.NameNormalizer.menuIntegration && Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer,
        'menuIntegration with zoteroDBAnalyzer available'
    );

    Zotero.debug('\n=== Test Results ===');
    Zotero.debug('Passed: ' + testResults.passed);
    Zotero.debug('Failed: ' + testResults.failed);

    return testResults;
}

// Expose globally for test runner
globalThis.ZoteroNERRunTests = runTests;
globalThis.ZoteroNERTestResults = testResults;

// Auto-run if in test mode
if (Zotero.Prefs.get('extensions.zotero-name-normalizer.testMode')) {
    (async function() {
        try {
            await runTests();
        } catch (e) {
            Zotero.debug('Test error: ' + e.message);
        }
    })();
}
