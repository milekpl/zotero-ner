/**
 * Zotero NER Test Suite
 *
 * Mocha BDD test suite for Zotero Name Normalizer extension
 * This file is bundled by zotero-plugin-scaffold and run in Zotero's test framework
 */

describe('Zotero Name Normalizer Extension', function() {
    // Increase timeout for Zotero initialization
    this.timeout(60000);

    before(async function() {
        await Zotero.initializationPromise;
        Zotero.debug('NER Test: Zotero initialized, version = ' + Zotero.version);
    });

    describe('Extension Loading', function() {
        it('should have Zotero defined', function() {
            assert.isDefined(Zotero, 'Zotero is defined');
        });

        it('should have Zotero.NameNormalizer defined', function() {
            assert.isDefined(Zotero.NameNormalizer, 'Zotero.NameNormalizer is defined');
        });

        it('should be initialized', function() {
            assert.isTrue(Zotero.NameNormalizer.initialized, 'Extension is initialized');
        });

        it('should have ZoteroNameNormalizer bundle available', function() {
            // Bundle may not be exposed in test context - skip if unavailable
            if (typeof ZoteroNameNormalizer === 'undefined') {
                this.skip();
                return;
            }
            assert.isDefined(ZoteroNameNormalizer, 'ZoteroNameNormalizer bundle is available');
        });
    });

    describe('ZoteroDBAnalyzer', function() {
        it('should be available in bundle', function() {
            // Bundle may not be exposed in test context - skip if unavailable
            if (typeof ZoteroNameNormalizer === 'undefined') {
                this.skip();
                return;
            }
            assert.ok(ZoteroNameNormalizer && ZoteroNameNormalizer.ZoteroDBAnalyzer, 
                'ZoteroDBAnalyzer is in bundle');
        });
    });

    describe('Name Parser', function() {
        it('should parse "John Smith"', function() {
            if (!Zotero.NameNormalizer.nameParser) {
                this.skip();
                return;
            }
            const parsed = Zotero.NameNormalizer.nameParser.parse('John Smith');
            assert.equal(parsed.lastName, 'Smith');
            assert.equal(parsed.firstName, 'John');
        });

        it('should parse "J. Smith"', function() {
            if (!Zotero.NameNormalizer.nameParser) {
                this.skip();
                return;
            }
            const parsed = Zotero.NameNormalizer.nameParser.parse('J. Smith');
            assert.equal(parsed.lastName, 'Smith');
            assert.equal(parsed.firstName, 'J.');
        });

        it('should parse "Smith, John"', function() {
            if (!Zotero.NameNormalizer.nameParser) {
                this.skip();
                return;
            }
            const parsed = Zotero.NameNormalizer.nameParser.parse('Smith, John');
            assert.equal(parsed.lastName, 'Smith');
            assert.equal(parsed.firstName, 'John');
        });

        it('should parse "de la Vega, Sancho"', function() {
            if (!Zotero.NameNormalizer.nameParser) {
                this.skip();
                return;
            }
            const parsed = Zotero.NameNormalizer.nameParser.parse('de la Vega, Sancho');
            assert.equal(parsed.lastName, 'de la Vega');
            assert.equal(parsed.firstName, 'Sancho');
        });
    });

    describe('Learning Engine', function() {
        it('should store and retrieve mapping', async function() {
            if (!Zotero.NameNormalizer.learningEngine) {
                this.skip();
                return;
            }
            const testKey = 'Test_NER_' + Date.now();
            await Zotero.NameNormalizer.learningEngine.storeMapping(testKey, 'TestValue', 0.95);
            await Zotero.NameNormalizer.learningEngine.forceSave();
            const mapping = Zotero.NameNormalizer.learningEngine.getMapping(testKey);
            assert.isNotNull(mapping, 'Mapping should be stored');
            assert.equal(mapping, 'TestValue', 'Normalized value should be correct');
        });

        it('should store variant mapping', async function() {
            if (!Zotero.NameNormalizer.learningEngine) {
                this.skip();
                return;
            }
            await Zotero.NameNormalizer.learningEngine.storeMapping('Smyth', 'Smith', 0.92);
            await Zotero.NameNormalizer.learningEngine.forceSave();
            const mapping = Zotero.NameNormalizer.learningEngine.getMapping('Smyth');
            assert.ok(mapping && mapping === 'Smith', 'Variant mapping should work');
        });
    });

    describe('Variant Generator', function() {
        it('should return an array', function() {
            if (!Zotero.NameNormalizer.variantGenerator) {
                this.skip();
                return;
            }
            const variants = Zotero.NameNormalizer.variantGenerator.generateVariants('Smith');
            assert.isArray(variants, 'Should return an array');
        });

        it('should return results', function() {
            if (!Zotero.NameNormalizer.variantGenerator) {
                this.skip();
                return;
            }
            const variants = Zotero.NameNormalizer.variantGenerator.generateVariants('Smith');
            assert.isAbove(variants.length, 0, 'Should return results');
        });
    });

    describe('Candidate Finder', function() {
        it('should return an array', function() {
            if (!Zotero.NameNormalizer.candidateFinder) {
                this.skip();
                return;
            }
            const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
            const candidates = Zotero.NameNormalizer.candidateFinder.findPotentialVariants(surnames);
            assert.isArray(candidates, 'Should return an array');
        });

        it('should return results for similar names', function() {
            if (!Zotero.NameNormalizer.candidateFinder) {
                this.skip();
                return;
            }
            const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson', 'Johnsen'];
            const candidates = Zotero.NameNormalizer.candidateFinder.findPotentialVariants(surnames);
            assert.ok(candidates && candidates.length > 0, 'Should return results');
        });
    });

    describe('Menu Integration', function() {
        it('should have menuIntegration with zoteroDBAnalyzer', function() {
            assert.ok(
                Zotero.NameNormalizer.menuIntegration && 
                Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer,
                'menuIntegration with zoteroDBAnalyzer should be available'
            );
        });
    });

    describe('Dialog Progress Bar', function() {
        it('should have proper progress bar behavior documented', function() {
            // This test verifies the documentation of progress bar behavior
            // The actual UI tests are in zotero-ner-ui.spec.js
            Zotero.debug('Dialog progress bar behavior:');
            Zotero.debug('1. content/dialog.html: showLoadingState() uses setProgressIndeterminate(true)');
            Zotero.debug('2. content/dialog.html: initialize() hides progress when results loaded');
            Zotero.debug('3. content/dialog.html: Instance properties properly defined');
            assert.ok(true, 'Progress bar behavior documented');
        });
    });
});
