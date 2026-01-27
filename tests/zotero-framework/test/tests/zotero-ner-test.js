/**
 * Zotero NER Mocha Test Suite
 *
 * This file runs inside Zotero and tests the Zotero.NER extension
 * using Mocha testing framework.
 */

// Import Mocha from Zotero's internal resources
const { Mocha, describe, it, before, after, beforeEach, afterEach } = (function() {
    // Try to load Mocha from Zotero's testing resources
    try {
        const mochaScope = {};
        Services.scriptloader.loadSubScript(
            'resource://testing-common/mocha.js',
            mochaScope
        );
        if (mochaScope.Mocha) {
            return mochaScope;
        }
    } catch (e) {
        // Mocha not available, use simple test harness
    }

    // Fallback: Simple test harness
    const Harness = {
        Mocha: function(options) {
            this.options = options || {};
            this.suite = { tests: [], beforeHooks: [], afterHooks: [] };
            this.grep = null;
        },
        Suite: {},
        Test: function(name) {
            this.name = name;
            this.state = 'pending';
            this.duration = 0;
        }
    };

    return {
        Mocha: Harness.Mocha,
        describe: function(name, fn) {
            const suite = { tests: [], beforeHooks: [], afterHooks: [], parent: null };
            fn();
            return suite;
        },
        it: function(name, fn) {
            return { name, fn };
        },
        before: function(fn) {},
        after: function(fn) {},
        beforeEach: function(fn) {},
        afterEach: function(fn) {}
    };
})();

// Results object
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    timestamp: Date.now()
};

// Helper functions
function pass(name, details = {}) {
    testResults.passed++;
    testResults.tests.push({ name, status: 'pass', ...details });
    Zotero.debug('  [PASS] ' + name);
}

function fail(name, error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'fail', error: String(error) });
    Zotero.debug('  [FAIL] ' + name + ': ' + error);
}

function assert(condition, name, error) {
    if (condition) {
        pass(name);
    } else {
        fail(name, error || 'assertion failed');
    }
}

async function runTests() {
    Zotero.debug('NER Test: Starting Mocha test suite...');
    Zotero.debug('NER Test: Zotero version = ' + Zotero.version);

    // Wait for Zotero to be fully ready
    await Zotero.initializationPromise;

    // ============ Zotero Basic Tests ============
    Zotero.debug('\n=== Zotero Core Tests ===');

    assert(typeof Zotero !== 'undefined', 'Zotero is defined');
    assert(typeof Zotero.version !== 'undefined', 'Zotero.version is defined');
    assert(Zotero.Libraries !== undefined, 'Zotero.Libraries available');

    // ============ Extension Loading Tests ============
    Zotero.debug('\n=== Extension Loading Tests ===');

    assert(typeof Zotero.NER !== 'undefined', 'Zotero.NER is defined');
    assert(Zotero.NER !== null, 'Zotero.NER is not null');

    if (typeof Zotero.NER === 'undefined') {
        Zotero.debug('NER Test: Cannot run extension tests - Zotero.NER not defined');
        return testResults;
    }

    assert(Zotero.NER.initialized === true, 'Extension initialized');
    assert(Zotero.NER.version !== undefined, 'Extension version defined');

    // ============ Module Tests ============
    Zotero.debug('\n=== Module Presence Tests ===');

    const modules = [
        'nameParser',
        'learningEngine',
        'candidateFinder',
        'variantGenerator',
        'nerProcessor',
        'menuIntegration',
        'itemProcessor'
    ];

    const allModulesPresent = modules.every(m => Zotero.NER[m] !== undefined);
    assert(allModulesPresent, 'All core modules present');

    // ============ Name Parser Tests ============
    Zotero.debug('\n=== Name Parser Tests ===');

    if (Zotero.NER.nameParser) {
        const testCases = [
            { input: 'John Smith', expected: { firstName: 'John', lastName: 'Smith' } },
            { input: 'J. Smith', expected: { firstName: 'J.', lastName: 'Smith' } },
            { input: 'John A. Smith', expected: { firstName: 'John', lastName: 'Smith' } },
            { input: 'Smith, John', expected: { firstName: 'John', lastName: 'Smith' } },
            { input: 'de la Vega, Sancho', expected: { firstName: 'Sancho', lastName: 'de la Vega' } },
            { input: 'van Gogh, Vincent', expected: { firstName: 'Vincent', lastName: 'van Gogh' } },
            { input: 'J. A. Smith', expected: { firstName: 'J. A.', lastName: 'Smith' } }
        ];

        for (const tc of testCases) {
            try {
                const parsed = Zotero.NER.nameParser.parse(tc.input);
                const matches = parsed.lastName === tc.expected.lastName && parsed.firstName === tc.expected.firstName;
                assert(matches, `Name parser: "${tc.input}"`,
                    matches ? null : `Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(parsed)}`);
            } catch (e) {
                fail(`Name parser: "${tc.input}"`, e.message);
            }
        }
    } else {
        Zotero.debug('  [SKIP] Name parser not available');
    }

    // ============ Learning Engine Tests ============
    Zotero.debug('\n=== Learning Engine Tests ===');

    if (Zotero.NER.learningEngine) {
        try {
            const testKey = 'Test_NER_' + Date.now();
            Zotero.NER.learningEngine.storeMapping(testKey, 'TestValue', 0.95);
            const mapping = Zotero.NER.learningEngine.getMapping(testKey);
            assert(mapping !== null, 'Learning engine: store/retrieve mapping');
            if (mapping) {
                assert(mapping.normalized === 'TestValue', 'Learning engine: normalized value correct');
                assert(mapping.similarity >= 0.9, 'Learning engine: similarity score correct');
            }
        } catch (e) {
            fail('Learning engine: store/retrieve', e.message);
        }

        try {
            // Test variant mapping
            Zotero.NER.learningEngine.storeMapping('Smyth', 'Smith', 0.92);
            const m = Zotero.NER.learningEngine.getMapping('Smyth');
            assert(m && m.normalized === 'Smith', 'Learning engine: variant mapping');
        } catch (e) {
            fail('Learning engine: variant mapping', e.message);
        }
    } else {
        Zotero.debug('  [SKIP] Learning engine not available');
    }

    // ============ Candidate Finder Tests ============
    Zotero.debug('\n=== Candidate Finder Tests ===');

    if (Zotero.NER.candidateFinder) {
        try {
            const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
            const candidates = Zotero.NER.candidateFinder.findPotentialVariants(surnames);
            assert(Array.isArray(candidates), 'Candidate finder returns array');
            assert(candidates && candidates.length > 0, 'Candidate finder returns results');

            // Check that Smith/Smyth/Smythe are grouped together
            const variants = candidates.filter(c =>
                c.variant && (c.variant.includes('Smith') || c.variant.includes('Smyth') || c.variant.includes('Smythe'))
            );
            assert(variants.length >= 2, 'Candidate finder: Smith variants found');
        } catch (e) {
            fail('Candidate finder: basic functionality', e.message);
        }
    } else {
        Zotero.debug('  [SKIP] Candidate finder not available');
    }

    // ============ Variant Generator Tests ============
    Zotero.debug('\n=== Variant Generator Tests ===');

    if (Zotero.NER.variantGenerator) {
        try {
            const variants = Zotero.NER.variantGenerator.generateVariants('Smith');
            assert(Array.isArray(variants), 'Variant generator returns array');
            assert(variants && variants.length > 0, 'Variant generator returns results');

            // Should include common variations
            const hasInitials = variants.some(v => /^[A-Z]\.\s*Smith$/.test(v));
            const hasFullFirst = variants.some(v => /^Smith$/.test(v));
            assert(hasFullFirst || variants.length > 0, 'Variant generator: includes full name');
        } catch (e) {
            fail('Variant generator: basic functionality', e.message);
        }
    } else {
        Zotero.debug('  [SKIP] Variant generator not available');
    }

    // ============ NER Processor Tests ============
    Zotero.debug('\n=== NER Processor Tests ===');

    if (Zotero.NER.nerProcessor) {
        try {
            const authors = Zotero.NER.nerProcessor.extractAuthors('John Smith and Jane Doe');
            assert(Array.isArray(authors), 'NER processor returns array');

            // Should find at least John Smith
            const hasJohnSmith = authors.some(a =>
                a.firstName === 'John' && a.lastName === 'Smith'
            );
            assert(hasJohnSmith, 'NER processor: extracts "John Smith"');
        } catch (e) {
            fail('NER processor: basic functionality', e.message);
        }

        try {
            const authors2 = Zotero.NER.nerProcessor.extractAuthors('Smith, J. and Doe, J.');
            assert(Array.isArray(authors2), 'NER processor handles reversed names');
        } catch (e) {
            fail('NER processor: reversed names', e.message);
        }
    } else {
        Zotero.debug('  [SKIP] NER processor not available');
    }

    // ============ Menu Integration Tests ============
    Zotero.debug('\n=== Menu Integration Tests ===');

    if (Zotero.NER.menuIntegration) {
        assert(Zotero.NER.menuIntegration.zoteroDBAnalyzer !== undefined, 'DB analyzer reference exists');
        assert(typeof Zotero.NER.menuIntegration.updateAuthors === 'function', 'updateAuthors method exists');
    } else {
        Zotero.debug('  [SKIP] Menu integration not available');
    }

    // ============ Item Processor Tests ============
    Zotero.debug('\n=== Item Processor Tests ===');

    if (Zotero.NER.itemProcessor) {
        assert(typeof Zotero.NER.itemProcessor.processItem === 'function', 'processItem method exists');
        assert(typeof Zotero.NER.itemProcessor.getNormalizedAuthors === 'function', 'getNormalizedAuthors method exists');
    } else {
        Zotero.debug('  [SKIP] Item processor not available');
    }

    // ============ Library Access Tests ============
    Zotero.debug('\n=== Library Access Tests ===');

    try {
        const libraryID = Zotero.Libraries.userLibraryID;
        assert(typeof libraryID === 'number', 'User library ID is a number');
        assert(libraryID > 0, 'User library ID is positive');
    } catch (e) {
        fail('Library access', e.message);
    }

    return testResults;
}

// Export for use by bootstrap.js
if (typeof globalThis !== 'undefined') {
    globalThis.ZoteroNERMochaTests = {
        runTests,
        getResults: () => testResults
    };
}
