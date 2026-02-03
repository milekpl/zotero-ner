/**
 * Test Fixture Data for Zotero Name Normalizer
 * 
 * Creates items with name variants that trigger normalization scenarios:
 * - Miłkowski vs Milkowski (diacritics)
 * - Smith vs Smyth vs Smythe (spelling variants)
 * - Johnson vs Johnsen (Scandinavian variants)
 * - "and Friston" malformed entries
 */

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
    
    // Test data with name variants that should trigger normalization
    const testData = [
        // Diacritics variants (Miłkowski vs Milkowski)
        {
            itemType: 'journalArticle',
            title: 'Explaining the Computational Mind',
            creators: [{ lastName: 'Miłkowski', firstName: 'Marcin', creatorType: 'author' }],
            date: '2013',
            publicationTitle: 'MIT Press'
        },
        {
            itemType: 'journalArticle',
            title: 'Computational Mechanisms and Models of Computation',
            creators: [{ lastName: 'Milkowski', firstName: 'Marcin', creatorType: 'author' }],
            date: '2014',
            publicationTitle: 'Studies in Logic'
        },
        {
            itemType: 'journalArticle',
            title: 'From Computer Metaphor to Computational Modeling',
            creators: [{ lastName: 'Milkowski', firstName: 'M.', creatorType: 'author' }],
            date: '2017',
            publicationTitle: 'Minds and Machines'
        },
        
        // Spelling variants (Smith/Smyth/Smythe)
        {
            itemType: 'journalArticle',
            title: 'Neural Correlates of Consciousness',
            creators: [{ lastName: 'Smith', firstName: 'John', creatorType: 'author' }],
            date: '2020',
            publicationTitle: 'Neuroscience Journal'
        },
        {
            itemType: 'journalArticle',
            title: 'Brain-Computer Interfaces',
            creators: [{ lastName: 'Smyth', firstName: 'John', creatorType: 'author' }],
            date: '2021',
            publicationTitle: 'Neural Computing'
        },
        {
            itemType: 'journalArticle',
            title: 'Machine Learning in Neuroscience',
            creators: [{ lastName: 'Smythe', firstName: 'J.', creatorType: 'author' }],
            date: '2022',
            publicationTitle: 'AI in Medicine'
        },
        
        // Scandinavian variants (Johnson/Johnsen/Johansson)
        {
            itemType: 'journalArticle',
            title: 'Cognitive Architecture Design',
            creators: [{ lastName: 'Johnson', firstName: 'Erik', creatorType: 'author' }],
            date: '2019',
            publicationTitle: 'Cognitive Science'
        },
        {
            itemType: 'journalArticle',
            title: 'Memory Systems in AI',
            creators: [{ lastName: 'Johnsen', firstName: 'Erik', creatorType: 'author' }],
            date: '2020',
            publicationTitle: 'Artificial Intelligence'
        },
        
        // Malformed entries (and Friston issue)
        {
            itemType: 'journalArticle',
            title: 'The Free Energy Principle',
            creators: [
                { lastName: 'Friston', firstName: 'Karl', creatorType: 'author' },
                { lastName: 'and Friston', firstName: '', creatorType: 'author' }  // Malformed
            ],
            date: '2010',
            publicationTitle: 'Nature Reviews Neuroscience'
        },
        {
            itemType: 'journalArticle',
            title: 'Active Inference and Learning',
            creators: [
                { lastName: 'Friston', firstName: 'K.', creatorType: 'author' },
                { lastName: 'Parr', firstName: 'Thomas', creatorType: 'author' }
            ],
            date: '2019',
            publicationTitle: 'Neural Computation'
        },
        
        // Multiple authors with variant names
        {
            itemType: 'journalArticle',
            title: 'Collaborative Study on Computation',
            creators: [
                { lastName: 'Miłkowski', firstName: 'Marcin', creatorType: 'author' },
                { lastName: 'Smith', firstName: 'John', creatorType: 'author' },
                { lastName: 'Johnson', firstName: 'E.', creatorType: 'author' }
            ],
            date: '2023',
            publicationTitle: 'Interdisciplinary Research'
        },
        
        // Edge cases
        {
            itemType: 'book',
            title: 'Introduction to Cognitive Science',
            creators: [
                { lastName: 'O\'Brien', firstName: 'Patrick', creatorType: 'author' },  // Apostrophe
                { lastName: 'de la Vega', firstName: 'Sancho', creatorType: 'author' }  // Compound surname
            ],
            date: '2018',
            publisher: 'Academic Press'
        },
        {
            itemType: 'journalArticle',
            title: 'Philosophy of Mind',
            creators: [
                { lastName: 'Obrien', firstName: 'P.', creatorType: 'author' }  // Without apostrophe
            ],
            date: '2019',
            publicationTitle: 'Philosophy Quarterly'
        }
    ];
    
    for (const data of testData) {
        const item = new Zotero.Item(data.itemType);
        item.setField('title', data.title);
        if (data.date) item.setField('date', data.date);
        if (data.publicationTitle) item.setField('publicationTitle', data.publicationTitle);
        if (data.publisher) item.setField('publisher', data.publisher);
        
        for (const creator of data.creators) {
            item.setCreator(item.numCreators(), creator);
        }
        
        item.addToCollection(collection.id);
        await item.saveTx();
        items.push(item);
        
        Zotero.debug(`NER Test Fixtures: Created "${data.title}" with ${data.creators.length} creator(s)`);
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
        // Diacritics: Miłkowski should normalize to Miłkowski (original)
        milkowski: {
            variants: ['Miłkowski', 'Milkowski'],
            expectedPrimary: 'Miłkowski',
            count: 3
        },
        // Spelling: Smith variants
        smith: {
            variants: ['Smith', 'Smyth', 'Smythe'],
            expectedPrimary: 'Smith',
            count: 3
        },
        // Scandinavian: Johnson variants
        johnson: {
            variants: ['Johnson', 'Johnsen'],
            expectedPrimary: 'Johnson',
            count: 2
        },
        // Malformed: and Friston (should be flagged)
        friston: {
            variants: ['Friston', 'and Friston'],
            hasMalformed: true,
            count: 2
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
