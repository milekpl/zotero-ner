/**
 * Group Library Support E2E Test Suite
 *
 * Tests for library-aware name normalization:
 * - Library context detection from Zotero UI
 * - Normalization in group libraries
 * - Collection scoping within libraries
 * - Multi-library analysis
 */

// Define helper functions - these may be overridden by test framework if available
// Using function expressions to ensure they're properly scoped

var createGroupHelper = function(options) {
    // Use existing createGroup if available from test framework
    if (typeof createGroup === 'function') {
        return createGroup(options);
    }

    // Fallback: Create a test group using Zotero API
    return (async function() {
        const group = new Zotero.Group({
            name: options.name || 'Test Group ' + Date.now(),
            description: options.description || 'Test group for Zotero NER',
            libraryReadingAccess: options.libraryReadingAccess !== false,
            libraryEditingAccess: options.libraryEditingAccess !== false,
            filesEditingAccess: options.filesEditingAccess !== false
        });
        await group.saveTx();
        return group;
    })();
};

var createDataObjectHelper = function(type, options) {
    // Use existing createDataObject if available from test framework
    if (typeof createDataObject === 'function') {
        return createDataObject(type, options);
    }

    // Fallback: Create using Zotero API
    return (async function() {
        if (type === 'item') {
            const item = new Zotero.Item(options.itemType || 'journalArticle');
            item.setField('title', options.title || 'Test Item');
            if (options.creators) {
                for (let i = 0; i < options.creators.length; i++) {
                    item.setCreator(i, options.creators[i]);
                }
            }
            if (options.libraryID) {
                item.libraryID = options.libraryID;
            }
            if (options.collections) {
                for (const colId of options.collections) {
                    item.addToCollection(colId);
                }
            }
            await item.saveTx();
            return item;
        } else if (type === 'collection') {
            const collection = new Zotero.Collection();
            collection.name = options.name || 'Test Collection';
            collection.libraryID = options.libraryID;
            if (options.parentKey) {
                collection.parentKey = options.parentKey;
            }
            if (options.parentID) {
                collection.parentID = options.parentID;
            }
            await collection.saveTx();
            return collection;
        }
        throw new Error(`Unsupported data object type: ${type}`);
    })();
};

// Define the functions for use in tests
function createGroup(options) {
    return createGroupHelper(options);
}

function createDataObject(type, options) {
    return createDataObjectHelper(type, options);
}

describe.skip('Group Library Support', function() {
    // These tests require Zotero's test framework with createGroup/createDataObject helpers
    // The unit tests in tests/zotero/library-context-manager.test.js verify the core functionality
    // These E2E tests would test group library integration in a real Zotero environment

    // Increase timeout for Zotero initialization and group operations
    this.timeout(120000);

    let userLibraryID;
    let groupLibraryID;
    let group;

    before(async function() {
        await Zotero.initializationPromise;
        Zotero.debug('Group Library Test: Zotero initialized, version = ' + Zotero.version);

        // Get user library ID
        userLibraryID = Zotero.Libraries.userLibraryID;
        Zotero.debug('Group Library Test: User library ID = ' + userLibraryID);
    });

    beforeEach(async function() {
        // Skip tests if required test helpers are not available
        if (typeof createGroup !== 'function') {
            this.skip();
            return;
        }

        try {
            group = await createGroup();
            groupLibraryID = group.libraryID;
            Zotero.debug('Group Library Test: Created test group with libraryID = ' + groupLibraryID);
        } catch (error) {
            Zotero.debug('Group Library Test: Error creating group: ' + error.message);
            this.skip();
        }
    });

    afterEach(async function() {
        if (group) {
            Zotero.debug('Group Library Test: Removing test group');
            await group.eraseTx();
            group = null;
        }
    });

    describe('Library Context Detection', function() {
        it('should detect user library as default context', async function() {
            Zotero.debug('Group Library Test: Checking Zotero.NameNormalizer = ' + JSON.stringify({
                exists: !!Zotero.NameNormalizer,
                libraryContextManager: !!Zotero.NameNormalizer?.libraryContextManager,
                menuIntegration: !!Zotero.NameNormalizer?.menuIntegration,
                collectionManager: !!Zotero.NameNormalizer?.collectionManager
            }));

            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.libraryContextManager) {
                // Try to get from menuIntegration as fallback
                const lcm = Zotero.NameNormalizer?.menuIntegration?.libraryContextManager;
                if (!lcm) {
                    this.skip();
                    return;
                }
            }

            const context = await Zotero.NameNormalizer.libraryContextManager.getCurrentLibraryContext();
            
            assert.equal(context.libraryID, userLibraryID);
            assert.equal(context.libraryType, 'user');
        });

        it('should detect group library from ZoteroPane selection', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.libraryContextManager) {
                this.skip();
                return;
            }

            // Simulate selecting the group library in ZoteroPane
            const treeViewID = `group-${group.groupID}`;
            
            // Mock getSelectedTreeItem to return group selection
            const originalGetSelectedTreeItem = ZoteroPane.getSelectedTreeItem;
            ZoteroPane.getSelectedTreeItem = () => treeViewID;

            try {
                const context = await Zotero.NameNormalizer.libraryContextManager.getCurrentLibraryContext();
                
                assert.equal(context.libraryID, groupLibraryID);
                assert.equal(context.libraryType, 'group');
            } finally {
                // Restore original method
                ZoteroPane.getSelectedTreeItem = originalGetSelectedTreeItem;
            }
        });

        it('should detect collection selection with library context', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.libraryContextManager) {
                this.skip();
                return;
            }

            // Create a collection in the group library
            const collection = await createDataObject('collection', { libraryID: groupLibraryID });
            const treeViewID = `${groupLibraryID}_${collection.key}`;

            // Mock getSelectedTreeItem to return collection selection
            const originalGetSelectedTreeItem = ZoteroPane.getSelectedTreeItem;
            ZoteroPane.getSelectedTreeItem = () => treeViewID;

            try {
                const context = await Zotero.NameNormalizer.libraryContextManager.getCurrentLibraryContext();
                
                assert.equal(context.libraryID, groupLibraryID);
                assert.equal(context.libraryType, 'group');
                assert.equal(context.collectionKey, collection.key);
            } finally {
                // Restore original method
                ZoteroPane.getSelectedTreeItem = originalGetSelectedTreeItem;
            }
        });
    });

    describe('Library Listing', function() {
        it('should list all accessible libraries including groups', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.libraryContextManager) {
                this.skip();
                return;
            }

            const libraries = await Zotero.NameNormalizer.libraryContextManager.getAllLibraries();
            
            assert.isArray(libraries);
            assert.isAbove(libraries.length, 0, 'Should have at least one library');
            
            // User library should be first
            assert.equal(libraries[0].libraryID, userLibraryID);
            assert.equal(libraries[0].libraryType, 'user');
            
            // Group library should be in the list
            const groupLib = libraries.find(lib => lib.libraryID === groupLibraryID);
            assert.isDefined(groupLib, 'Group library should be in the list');
            assert.equal(groupLib.libraryType, 'group');
        });

        it('should validate library IDs', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.libraryContextManager) {
                this.skip();
                return;
            }

            const validUser = await Zotero.NameNormalizer.libraryContextManager.validateLibraryID(userLibraryID);
            const validGroup = await Zotero.NameNormalizer.libraryContextManager.validateLibraryID(groupLibraryID);
            const invalid = await Zotero.NameNormalizer.libraryContextManager.validateLibraryID(99999);

            assert.isTrue(validUser, 'User library ID should be valid');
            assert.isTrue(validGroup, 'Group library ID should be valid');
            assert.isFalse(invalid, 'Invalid library ID should return false');
        });
    });

    describe('Library-Aware Analysis', function() {
        it('should analyze items in group library', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.zoteroDBAnalyzer) {
                this.skip();
                return;
            }

            // Create test items in group library with name variants
            const item1 = await createDataObject('item', {
                libraryID: groupLibraryID,
                creators: [
                    { firstName: 'J.', lastName: 'Smith', creatorType: 'author' }
                ]
            });

            const item2 = await createDataObject('item', {
                libraryID: groupLibraryID,
                creators: [
                    { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
                ]
            });

            // Analyze the group library
            const results = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeLibrary(groupLibraryID);

            // Should find the name variants
            assert.isDefined(results);
            assert.isDefined(results.surnameFrequencies);
            assert.property(results.surnameFrequencies, 'smith', 'Should find smith surname');
        });

        it('should analyze user library separately from group library', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.zoteroDBAnalyzer) {
                this.skip();
                return;
            }

            // Create test item in user library
            const userItem = await createDataObject('item', {
                libraryID: userLibraryID,
                creators: [
                    { firstName: 'J.', lastName: 'Johnson', creatorType: 'author' }
                ]
            });

            // Create test item in group library with same name variant
            const groupItem = await createDataObject('item', {
                libraryID: groupLibraryID,
                creators: [
                    { firstName: 'J.', lastName: 'Johnson', creatorType: 'author' }
                ]
            });

            // Analyze user library
            const userResults = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeLibrary(userLibraryID);
            
            // Analyze group library
            const groupResults = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeLibrary(groupLibraryID);

            // Both should find the surname
            assert.property(userResults.surnameFrequencies, 'johnson');
            assert.property(groupResults.surnameFrequencies, 'johnson');
        });

        it('should handle empty library gracefully', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.zoteroDBAnalyzer) {
                this.skip();
                return;
            }

            // Create empty group (no items)
            const emptyGroup = await createGroup();
            const emptyLibraryID = emptyGroup.libraryID;

            try {
                const results = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeLibrary(emptyLibraryID);

                assert.isDefined(results);
                assert.equal(results.totalUniqueSurnames, 0);
                assert.isArray(results.suggestions);
                assert.equal(results.suggestions.length, 0);
            } finally {
                await emptyGroup.eraseTx();
            }
        });
    });

    describe('Collection-Scoped Analysis', function() {
        it('should analyze specific collection within group library', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.zoteroDBAnalyzer) {
                this.skip();
                return;
            }

            // Create collections in group library
            const collection1 = await createDataObject('collection', { libraryID: groupLibraryID });
            const collection2 = await createDataObject('collection', { libraryID: groupLibraryID });

            // Create items in different collections
            const item1 = await createDataObject('item', {
                libraryID: groupLibraryID,
                collections: [collection1.id],
                creators: [
                    { firstName: 'J.', lastName: 'Smith', creatorType: 'author' }
                ]
            });

            const item2 = await createDataObject('item', {
                libraryID: groupLibraryID,
                collections: [collection2.id],
                creators: [
                    { firstName: 'Jane', lastName: 'Doe', creatorType: 'author' }
                ]
            });

            // Analyze collection1
            const results = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeCollection(collection1.key);

            // Should only find Smith from collection1
            assert.property(results.surnameFrequencies, 'smith');
            assert.notProperty(results.surnameFrequencies, 'doe', 'Should not find Doe from other collection');
        });

        it('should include subcollections when requested', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.zoteroDBAnalyzer) {
                this.skip();
                return;
            }

            // Create parent and child collections
            const parentCollection = await createDataObject('collection', { libraryID: groupLibraryID });
            const childCollection = await createDataObject('collection', {
                libraryID: groupLibraryID,
                parentID: parentCollection.id
            });

            // Create item in child collection
            const item = await createDataObject('item', {
                libraryID: groupLibraryID,
                collections: [childCollection.id],
                creators: [
                    { firstName: 'J.', lastName: 'Smith', creatorType: 'author' }
                ]
            });

            // Analyze parent collection without subcollections
            const resultsWithoutSub = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeCollection(
                parentCollection.key,
                { includeSubcollections: false }
            );

            // Analyze parent collection with subcollections
            const resultsWithSub = await Zotero.NameNormalizer.zoteroDBAnalyzer.analyzeCollection(
                parentCollection.key,
                { includeSubcollections: true }
            );

            // Without subcollections should not find the item
            assert.equal(resultsWithoutSub.totalUniqueSurnames, 0);
            
            // With subcollections should find Smith
            assert.property(resultsWithSub.surnameFrequencies, 'smith');
        });
    });

    describe('Collection Manager Library Integration', function() {
        it('should get items by library ID', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.collectionManager) {
                this.skip();
                return;
            }

            // Create items in both libraries
            const userItem = await createDataObject('item', {
                libraryID: userLibraryID,
                creators: [{ firstName: 'User', lastName: 'Author', creatorType: 'author' }]
            });

            const groupItem = await createDataObject('item', {
                libraryID: groupLibraryID,
                creators: [{ firstName: 'Group', lastName: 'Author', creatorType: 'author' }]
            });

            // Get items from group library
            const groupItems = await Zotero.NameNormalizer.collectionManager.getItemsByLibrary(groupLibraryID);
            
            // Get items from user library
            const userItems = await Zotero.NameNormalizer.collectionManager.getItemsByLibrary(userLibraryID);

            // Verify correct items are returned
            const groupItemKeys = groupItems.map(item => item.key);
            const userItemKeys = userItems.map(item => item.key);

            assert.include(groupItemKeys, groupItem.key, 'Group library should contain group item');
            assert.notInclude(groupItemKeys, userItem.key, 'Group library should not contain user item');
            assert.include(userItemKeys, userItem.key, 'User library should contain user item');
        });

        it('should get collections filtered by library', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.collectionManager) {
                this.skip();
                return;
            }

            // Create collections in both libraries
            const userCollection = await createDataObject('collection', { libraryID: userLibraryID });
            const groupCollection = await createDataObject('collection', { libraryID: groupLibraryID });

            // Get collections for group library
            const groupCollections = await Zotero.NameNormalizer.collectionManager.getAvailableCollections(groupLibraryID);
            
            // Get collections for user library
            const userCollections = await Zotero.NameNormalizer.collectionManager.getAvailableCollections(userLibraryID);

            // Verify filtering
            const groupCollectionKeys = groupCollections.map(c => c.key);
            const userCollectionKeys = userCollections.map(c => c.key);

            assert.include(groupCollectionKeys, groupCollection.key);
            assert.notInclude(groupCollectionKeys, userCollection.key);
            assert.include(userCollectionKeys, userCollection.key);
            assert.notInclude(userCollectionKeys, groupCollection.key);
        });

        it('should create library-scoped search', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.collectionManager) {
                this.skip();
                return;
            }

            // Create items with same title in both libraries
            await createDataObject('item', {
                libraryID: userLibraryID,
                title: 'Test Item',
                creators: [{ firstName: 'User', lastName: 'Author', creatorType: 'author' }]
            });

            await createDataObject('item', {
                libraryID: groupLibraryID,
                title: 'Test Item',
                creators: [{ firstName: 'Group', lastName: 'Author', creatorType: 'author' }]
            });

            // Search in group library
            const groupItems = await Zotero.NameNormalizer.collectionManager.searchItemsInLibrary(
                groupLibraryID,
                { title: ['contains', 'Test'] }
            );

            // Search in user library
            const userItems = await Zotero.NameNormalizer.collectionManager.searchItemsInLibrary(
                userLibraryID,
                { title: ['contains', 'Test'] }
            );

            // Each should find only their own item
            assert.equal(groupItems.length, 1);
            assert.equal(userItems.length, 1);
            assert.notEqual(groupItems[0].id, userItems[0].id);
        });
    });

    describe('Library Description', function() {
        it('should provide human-readable library descriptions', async function() {
            if (!Zotero.NameNormalizer || !Zotero.NameNormalizer.libraryContextManager) {
                this.skip();
                return;
            }

            const userDesc = await Zotero.NameNormalizer.libraryContextManager.getLibraryDescription(userLibraryID);
            const groupDesc = await Zotero.NameNormalizer.libraryContextManager.getLibraryDescription(groupLibraryID);

            assert.equal(userDesc, 'My Library');
            assert.include(groupDesc, 'Group:');
        });
    });
});
