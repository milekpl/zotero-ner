/**
 * Test Fixture Data for Zotero Name Normalizer
 * 
 * Creates items with name variants that the analyzer ACTUALLY detects:
 * - Diacritics-only (SAME firstName): Marcin Miłkowski/Milkowski, Andreas Müller/Mueller, José García/Garcia
 * - Same surnames with different case: Peter Godfrey-Smith vs Godfrey-smith
 * - Repeated authors for frequency analysis: Multiple entries for Karl Fodor, Daniel Dennett, Karl Friston
 * 
 * CRITICAL: Analyzer groups by firstName|lastName pairs, so diacritics-only variants 
 * require the EXACT same firstName and only diacritic differences in lastName.
 * 
 * This suite creates a global fixture that persists across all test suites.
 */

describe('Test Fixtures Setup', function() {
    this.timeout(120000);
    
    before(async function() {
        Zotero.debug('Test Fixtures: Setting up global test library...');
        // Fixtures will be created and stored globally
        await createTestFixtures();
    });
    
    it('should initialize test fixtures', async function() {
        // Check that fixtures were created
        const items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
        assert.isAbove(items.length, 0, 'Fixtures should have created items');
        
        // Count Miłkowski/Milkowski creators specifically
        let milkowskiCount = 0;
        for (const item of items) {
            const creators = item.getCreators?.();
            if (creators) {
                for (const creator of creators) {
                    if ((creator.lastName || '').toLowerCase().includes('milkowski')) {
                        milkowskiCount++;
                    }
                }
            }
        }
        
        Zotero.debug('Test Fixtures: Initialized with ' + items.length + ' items, ' + milkowskiCount + ' Miłkowski creators');
        console.log('Test Fixtures initialized with ' + items.length + ' items, ' + milkowskiCount + ' Miłkowski/Milkowski creators');
        assert.isAbove(milkowskiCount, 0, 'Should have Miłkowski/Milkowski creators');
    });
    
    // Don't cleanup - let other tests use the fixtures
    // Cleanup will happen after all tests complete
});

/**
 * Create test items in the Zotero library
 * @returns {Promise<{items: Zotero.Item[], collectionId: number}>}
 */
async function createTestFixtures() {
    Zotero.debug('NER Test Fixtures: Creating test items...');
    
    // Create a test collection
    const collection = new Zotero.Collection();
    collection.name = 'NER Test Fixtures';
    await collection.saveTx();
    
    const items = [];
    
    // Test data with ACTUAL supported name variants based on unit tests:
    // 1. Diacritics-only: Miłkowski/Milkowski, Müller/Mueller, José/Jose, café/cafe
    // 2. First-name variations for SAME surname: Jerry/J./Jerry Alan Fodor, Daniel/D./D.C. Dennett
    // The analyzer DOES NOT detect: Smith/Smyth/Smythe or Johnson/Johnsen (different surnames)
    const testData = [
        // Fodor: First-name variants (Jerry, J., Jerry Alan, J.A.)
        { itemType: 'journalArticle', title: 'The Modularity of Mind', creators: [{ lastName: 'Fodor', firstName: 'Jerry', creatorType: 'author' }], date: '2015', publicationTitle: 'Philosophy Today' },
        { itemType: 'journalArticle', title: 'Concepts', creators: [{ lastName: 'Fodor', firstName: 'J.', creatorType: 'author' }], date: '2016', publicationTitle: 'Philosophy Review' },
        { itemType: 'journalArticle', title: 'The Mind Doesn\'t Work That Way', creators: [{ lastName: 'Fodor', firstName: 'Jerry Alan', creatorType: 'author' }], date: '2017', publicationTitle: 'Cognitive Science' },
        { itemType: 'journalArticle', title: 'In Critical Condition', creators: [{ lastName: 'Fodor', firstName: 'J.A.', creatorType: 'author' }], date: '2018', publicationTitle: 'Philosophy of Mind' },
        
        // Dennett: First-name variants (Daniel, D., D.C.)
        { itemType: 'journalArticle', title: 'Consciousness Explained', creators: [{ lastName: 'Dennett', firstName: 'Daniel', creatorType: 'author' }], date: '2014', publicationTitle: 'Philosophy' },
        { itemType: 'journalArticle', title: 'Kinds of Minds', creators: [{ lastName: 'Dennett', firstName: 'D.', creatorType: 'author' }], date: '2015', publicationTitle: 'Mind and Language' },
        { itemType: 'journalArticle', title: 'Darwin\'s Dangerous Idea', creators: [{ lastName: 'Dennett', firstName: 'D.C.', creatorType: 'author' }], date: '2016', publicationTitle: 'Evolution and Mind' },
        
        // Miłkowski/Milkowski: Diacritics-only variants (ł vs l)
        // CRITICAL: SAME firstName "Marcin" is required for grouping as same author
        { itemType: 'journalArticle', title: 'Explaining the Computational Mind', creators: [{ lastName: 'Miłkowski', firstName: 'Marcin', creatorType: 'author' }], date: '2013', publicationTitle: 'Cognitive Science' },
        { itemType: 'journalArticle', title: 'Computational Mechanisms', creators: [{ lastName: 'Milkowski', firstName: 'Marcin', creatorType: 'author' }], date: '2014', publicationTitle: 'Philosophy of Science' },
        { itemType: 'journalArticle', title: 'Computer Metaphor', creators: [{ lastName: 'Miłkowski', firstName: 'Marcin', creatorType: 'author' }], date: '2017', publicationTitle: 'Journal of Philosophy' },
        
        // Müller/Mueller: Diacritics-only variants (ü vs ue)
        // CRITICAL: SAME firstName "Andreas"
        { itemType: 'journalArticle', title: 'Machine Learning Methods', creators: [{ lastName: 'Müller', firstName: 'Andreas', creatorType: 'author' }], date: '2021', publicationTitle: 'Neural Networks' },
        { itemType: 'journalArticle', title: 'Pattern Recognition', creators: [{ lastName: 'Mueller', firstName: 'Andreas', creatorType: 'author' }], date: '2021', publicationTitle: 'Machine Learning' },
        { itemType: 'journalArticle', title: 'Deep Learning', creators: [{ lastName: 'Müller', firstName: 'Andreas', creatorType: 'author' }], date: '2022', publicationTitle: 'AI Review' },
        
        // García/Garcia: Diacritics-only variants (á vs a) 
        // NOTE: José/Jose would be a separate variant - same lastName (García/Garcia) but different firstName normalizes separately
        { itemType: 'journalArticle', title: 'Spanish Cognitive Science', creators: [{ lastName: 'García', firstName: 'José', creatorType: 'author' }], date: '2010', publicationTitle: 'Philosophy Review' },
        { itemType: 'journalArticle', title: 'Cognition and Culture', creators: [{ lastName: 'Garcia', firstName: 'Jose', creatorType: 'author' }], date: '2010', publicationTitle: 'Cultural Studies' },
        
        // Godfrey-Smith: Case variation (Godfrey-Smith vs Godfrey-smith) - SAME firstName "Peter"
        { itemType: 'journalArticle', title: 'Philosophy of Biology', creators: [{ lastName: 'Godfrey-Smith', firstName: 'Peter', creatorType: 'author' }], date: '2009', publicationTitle: 'Biology and Philosophy' },
        { itemType: 'journalArticle', title: 'Complexity and the Function of Mind', creators: [{ lastName: 'Godfrey-smith', firstName: 'Peter', creatorType: 'author' }], date: '2009', publicationTitle: 'Synthese' },
        
        // Friston: Multiple occurrences for detection
        { itemType: 'journalArticle', title: 'The Free Energy Principle', creators: [{ lastName: 'Friston', firstName: 'Karl', creatorType: 'author' }], date: '2010', publicationTitle: 'Nature Reviews Neuroscience' },
        { itemType: 'journalArticle', title: 'The Free Energy Principle for Action', creators: [{ lastName: 'Friston', firstName: 'Karl', creatorType: 'author' }], date: '2011', publicationTitle: 'Neuroscience' },
    ];
    
    for (const data of testData) {
        const item = new Zotero.Item(data.itemType);
        item.setField('title', data.title);
        if (data.date) item.setField('date', data.date);
        if (data.publicationTitle) item.setField('publicationTitle', data.publicationTitle);
        if (data.publisher) item.setField('publisher', data.publisher);
        
        // Add creators - use addCreator or setCreator properly
        for (let i = 0; i < data.creators.length; i++) {
            const creatorData = data.creators[i];
            item.setCreator(i, {
                firstName: creatorData.firstName || '',
                lastName: creatorData.lastName || '',
                creatorType: creatorData.creatorType || 'author'
            });
        }
        
        item.addToCollection(collection.id);
        await item.saveTx();
        items.push(item);
        
        Zotero.debug(`NER Test Fixtures: Created "${data.title}" with ${data.creators.length} creator(s)`);
        const creators = item.getCreators();
        Zotero.debug(`NER Test Fixtures: Item has ${creators.length} creators: ${JSON.stringify(creators)}`);
    }
    
    Zotero.debug(`NER Test Fixtures: Created ${items.length} test items in collection "${collection.name}"`);
    
    return { items, collectionId: collection.id };
}

/**
 * Clean up test fixtures
 * @param {number} collectionId 
 */
async function cleanupTestFixtures(collectionId) {
    if (!collectionId) return;
    
    try {
        const collection = await Zotero.Collections.getAsync(collectionId);
        if (collection) {
            const itemIds = collection.getChildItems(true);
            if (itemIds.length > 0) {
                await Zotero.Items.trashTx(itemIds);
                await Zotero.Items.emptyTrashTx();
            }
            await collection.eraseTx();
        }
        Zotero.debug('NER Test Fixtures: Cleanup complete');
    } catch (e) {
        Zotero.debug('NER Test Fixtures: Cleanup error: ' + e.message);
    }
}

/**
 * Get expected normalization groups from fixtures
 * Used to verify test results
 */
function getExpectedNormalizationGroups() {
    return {
        // Fodor: Jerry, J., Jerry Alan, J.A. are variants of same author
        fodor: {
            variants: ['Jerry', 'J.', 'Jerry Alan', 'J.A.'],
            expectedPrimary: 'Jerry',
            surname: 'Fodor',
            count: 4
        },
        // Dennett: Daniel, D., D.C. are variants of same author
        dennett: {
            variants: ['Daniel', 'D.', 'D.C.'],
            expectedPrimary: 'Daniel',
            surname: 'Dennett',
            count: 3
        },
        // Miłkowski/Milkowski: Diacritics variant (ł vs l)
        milkowski: {
            variants: ['Miłkowski', 'Milkowski'],
            expectedPrimary: 'Miłkowski',
            surname: 'Miłkowski',
            count: 3
        },
        // Müller/Mueller: Diacritics variant (ü vs ue)
        mueller: {
            variants: ['Müller', 'Mueller'],
            expectedPrimary: 'Müller',
            surname: 'Müller',
            count: 3
        },
        // García/Garcia + José/Jose: Diacritics variants
        garcia: {
            variants: ['García', 'Garcia'],
            expectedPrimary: 'García',
            surname: 'García',
            count: 3
        },
        // Godfrey-Smith: Case variant + first-name variants
        godfreysmith: {
            variants: ['Godfrey-Smith', 'Godfrey-smith'],
            expectedPrimary: 'Godfrey-Smith',
            surname: 'Godfrey-Smith',
            count: 3
        },
        // Friston: First-name variants (Karl, K., K.J.)
        friston: {
            variants: ['Karl', 'K.', 'K.J.'],
            expectedPrimary: 'Karl',
            surname: 'Friston',
            count: 4
        }
    };
}

// Export for use in tests
if (typeof globalThis !== 'undefined') {
    globalThis.NERTestFixtures = {
        createTestFixtures,
        cleanupTestFixtures,
        getExpectedNormalizationGroups
    };
}
