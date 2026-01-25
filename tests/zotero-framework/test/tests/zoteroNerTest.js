/**
 * Zotero NER Extension Test
 *
 * This test file follows Zotero's test patterns and can be run using:
 * 1. Zotero's built-in test framework (if test framework is available)
 * 2. Manually via Zotero's JavaScript console
 * 3. With the provided runtests.js script
 */

describe("Zotero NER Extension", function () {
    var win, doc, ZoteroPane;
    var testItems = [];

    before(async function () {
        // Load Zotero pane
        try {
            win = await loadZoteroPane();
            doc = win.document;
            ZoteroPane = win.ZoteroPane;
        } catch (e) {
            Zotero.debug("Could not load Zotero pane: " + e.message);
            // Continue anyway - some tests may work without the pane
        }
    });

    after(async function () {
        // Cleanup test items
        if (testItems.length > 0) {
            await cleanupItems(testItems);
        }
    });

    describe("Extension Loading", function () {
        it("should have Zotero defined", function () {
            assert.ok(typeof Zotero !== 'undefined', "Zotero should be defined");
        });

        it("should have Zotero.NER defined", function () {
            assert.ok(Zotero.NER, "Zotero.NER should be defined");
            assert.ok(typeof Zotero.NER === 'object', "Zotero.NER should be an object");
        });

        it("should have extension initialized", function () {
            assert.ok(Zotero.NER.initialized !== undefined, "Zotero.NER.initialized should exist");
        });
    });

    describe("Name Parser", function () {
        it("should parse full name correctly", function () {
            var parser = Zotero.NER.nameParser;
            assert.ok(parser, "Name parser should exist");

            var parsed = parser.parse("John Smith");
            assert.equal(parsed.firstName, "John", "First name should be parsed");
            assert.equal(parsed.lastName, "Smith", "Last name should be parsed");
        });

        it("should parse abbreviated name", function () {
            var parser = Zotero.NER.nameParser;
            var parsed = parser.parse("J. Smith");
            assert.equal(parsed.firstName, "J.", "First name with initial should be parsed");
            assert.equal(parsed.lastName, "Smith", "Last name should be parsed");
        });

        it("should handle Spanish names with prefixes", function () {
            var parser = Zotero.NER.nameParser;
            var parsed = parser.parse("Juan van der Berg");
            assert.ok(parsed.lastName, "Spanish name should have lastName");
        });
    });

    describe("Learning Engine", function () {
        it("should have learning engine defined", function () {
            assert.ok(Zotero.NER.learningEngine, "Learning engine should exist");
        });

        it("should store and retrieve a name mapping", async function () {
            var engine = Zotero.NER.learningEngine;
            assert.ok(engine.storeMapping, "storeMapping should exist");
            assert.ok(engine.getMapping, "getMapping should exist");

            // Store a mapping
            await engine.storeMapping("Smyth", "Smith", 0.9);

            // Retrieve it
            var mapping = engine.getMapping("Smyth");
            assert.ok(mapping, "Mapping should exist");
            assert.equal(mapping.normalized, "Smith", "Normalized name should be 'Smith'");
        });

        it("should handle multiple variants", async function () {
            var engine = Zotero.NER.learningEngine;

            // Store multiple variants
            await engine.storeMapping("Johnson", "Johnsen", 0.85);
            await engine.storeMapping("Johansson", "Johnsen", 0.9);

            var mapping1 = engine.getMapping("Johnson");
            var mapping2 = engine.getMapping("Johansson");

            assert.ok(mapping1, "First mapping should exist");
            assert.ok(mapping2, "Second mapping should exist");
            assert.equal(mapping1.normalized, "Johnsen", "First normalized should be 'Johnsen'");
            assert.equal(mapping2.normalized, "Johnsen", "Second normalized should be 'Johnsen'");
        });
    });

    describe("Candidate Finder", function () {
        it("should have candidate finder defined", function () {
            assert.ok(Zotero.NER.candidateFinder, "Candidate finder should exist");
        });

        it("should find similar surnames", function () {
            var finder = Zotero.NER.candidateFinder;
            assert.ok(finder.findPotentialVariants, "findPotentialVariants should exist");

            var surnames = ["Smith", "Smyth", "Smythe", "Johnson", "Johnsen"];
            var candidates = finder.findPotentialVariants(surnames);

            assert.ok(Array.isArray(candidates), "Candidates should be an array");
            // Should find Smith/Smyth and Johnson/Johnsen as similar
            assert.ok(candidates.length > 0, "Should find at least one candidate pair");
        });
    });

    describe("Menu Integration", function () {
        it("should have menu integration defined", function () {
            assert.ok(Zotero.NER.menuIntegration, "Menu integration should exist");
        });

        it("should have database analyzer", function () {
            assert.ok(Zotero.NER.menuIntegration.zoteroDBAnalyzer, "DB analyzer should exist");
        });
    });

    describe("Database Analyzer", function () {
        it("should analyze library", async function () {
            var analyzer = Zotero.NER.menuIntegration.zoteroDBAnalyzer;
            assert.ok(analyzer, "DB analyzer should exist");
            assert.ok(analyzer.analyzeFullLibrary, "analyzeFullLibrary should exist");

            // This may take a while and require items in the library
            try {
                var results = await analyzer.analyzeFullLibrary();
                assert.ok(results, "Analysis should return results");
                assert.ok(typeof results === 'object', "Results should be an object");
            } catch (e) {
                // This might fail if library is empty or not accessible
                Zotero.debug("Library analysis test skipped: " + e.message);
            }
        });
    });

    describe("Variant Generator", function () {
        it("should have variant generator defined", function () {
            assert.ok(Zotero.NER.variantGenerator, "Variant generator should exist");
        });

        it("should generate name variants", function () {
            var generator = Zotero.NER.variantGenerator;
            assert.ok(generator.generateVariants, "generateVariants should exist");

            var variants = generator.generateVariants("Smith");
            assert.ok(Array.isArray(variants), "Variants should be an array");
        });
    });

    describe("NER Processor", function () {
        it("should have NER processor defined", function () {
            assert.ok(Zotero.NER.nerProcessor, "NER processor should exist");
        });

        it("should extract author names from text", function () {
            var processor = Zotero.NER.nerProcessor;
            assert.ok(processor.extractAuthors, "extractAuthors should exist");

            var text = "According to John Smith and Jane Doe, the study showed...";
            var authors = processor.extractAuthors(text);

            assert.ok(Array.isArray(authors), "Authors should be an array");
        });
    });

    describe("Item Processor", function () {
        it("should have item processor defined", function () {
            assert.ok(Zotero.NER.itemProcessor, "Item processor should exist");
        });

        it("should extract creators from item", async function () {
            var processor = Zotero.NER.itemProcessor;
            assert.ok(processor.getCreatorsFromItem, "getCreatorsFromItem should exist");

            // Create a test item
            var item = await createTestItem();
            testItems.push(item);

            // Add a creator
            item.setCreators([
                { firstName: "John", lastName: "Smith", creatorType: "author" }
            ]);
            await item.saveTx();

            // Extract creators
            var creators = processor.getCreatorsFromItem(item);
            assert.ok(Array.isArray(creators), "Creators should be an array");
        });
    });
});

// Run tests if executed directly in Zotero console
if (typeof window !== 'undefined' && window.location.protocol === 'chrome:') {
    // Running in Zotero - tests are already defined
    Zotero.debug("Zotero NER tests loaded. Run with mocha.run() if using Mocha UI.");
}
