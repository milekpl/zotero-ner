/**
 * Unit tests for CollectionManager
 * Tests graceful handling of missing Zotero context and method signatures
 * Includes tests for library-aware operations (group library support)
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Store original Zotero reference
const originalZotero = typeof Zotero !== 'undefined' ? Zotero : undefined;

describe('CollectionManager', () => {
  let CollectionManager;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    // Re-mock console
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    // Clear console mocks
    console.log.mockClear();
    console.error.mockClear();
    console.warn.mockClear();
    CollectionManager = require('../../src/zotero/collection-manager.js');
  });

  afterAll(() => {
    // Restore original Zotero
    if (originalZotero !== undefined) {
      global.Zotero = originalZotero;
    }
  });

  describe('isZoteroAvailable', () => {
    test('should return false when Zotero is undefined', () => {
      delete global.Zotero;
      // Need to require after deleting
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(manager.isZoteroAvailable()).toBe(false);
    });

    test('should return false when Zotero is null', () => {
      global.Zotero = null;
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(manager.isZoteroAvailable()).toBe(false);
    });

    test('should return true when Zotero is defined', () => {
      global.Zotero = { test: true };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(manager.isZoteroAvailable()).toBe(true);
    });
  });

  describe('getAvailableCollections', () => {
    test('should throw error when Zotero is undefined', () => {
      delete global.Zotero;
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getAvailableCollections())
        .toThrow('Zotero context is undefined');
    });

    test('should throw error when Zotero.Collections is undefined', () => {
      global.Zotero = { Collections: undefined };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getAvailableCollections())
        .toThrow('Failed to get collections');
    });

    test('should return collections when Zotero is available', () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue([
            { key: 'col1', name: 'Collection 1', parentKey: null },
            { key: 'col2', name: 'Collection 2', parentKey: 'col1' }
          ])
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const collections = manager.getAvailableCollections();

      expect(collections).toHaveLength(2);
      expect(collections[0]).toHaveProperty('key', 'col1');
      expect(collections[0]).toHaveProperty('name', 'Collection 1');
      expect(collections[0]).toHaveProperty('parentKey', null);
      expect(collections[1]).toHaveProperty('parentKey', 'col1');
    });

    test('should handle collection without parentKey', () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue([
            { key: 'col1', name: 'Collection 1' }
          ])
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const collections = manager.getAvailableCollections();

      expect(collections[0].parentKey).toBeNull();
    });

    test('should rethrow error with context', () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockImplementation(() => {
            throw new Error('DB error');
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getAvailableCollections())
        .toThrow('Failed to get collections: DB error');
    });
  });

  describe('getItemsInCollection', () => {
    test('should throw error when Zotero is undefined', () => {
      delete global.Zotero;
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getItemsInCollection('col1'))
        .toThrow('Zotero context is undefined');
    });

    test('should throw error when collection not found', () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue(null)
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getItemsInCollection('nonexistent'))
        .toThrow('Collection not found: nonexistent');
    });

    test('should return items from collection', () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue({
            getItems: jest.fn().mockReturnValue(mockItems)
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const items = manager.getItemsInCollection('col1');

      expect(items).toEqual(mockItems);
      expect(global.Zotero.Collections.get).toHaveBeenCalledWith('col1');
    });

    test('should rethrow error with context', () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockImplementation(() => {
            throw new Error('DB error');
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getItemsInCollection('col1'))
        .toThrow('Failed to get items in collection: DB error');
    });
  });

  describe('getCollectionsForItem', () => {
    test('should throw error when Zotero is undefined', () => {
      delete global.Zotero;
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getCollectionsForItem(1))
        .toThrow('Zotero context is undefined');
    });

    test('should throw error when item not found', () => {
      global.Zotero = {
        Items: {
          get: jest.fn().mockReturnValue(null)
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getCollectionsForItem(999))
        .toThrow('Item not found: 999');
    });

    test('should return empty array when item has no collections', () => {
      global.Zotero = {
        Items: {
          get: jest.fn().mockReturnValue({
            getCollections: jest.fn().mockReturnValue([])
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const collections = manager.getCollectionsForItem(1);

      expect(collections).toEqual([]);
    });

    test('should return collections for item', () => {
      global.Zotero = {
        Items: {
          get: jest.fn().mockReturnValue({
            getCollections: jest.fn().mockReturnValue(['col1', 'col2'])
          })
        },
        Collections: {
          get: jest.fn((key) => {
            const collections = {
              col1: { key: 'col1', name: 'Collection 1' },
              col2: { key: 'col2', name: 'Collection 2' }
            };
            return collections[key];
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const collections = manager.getCollectionsForItem(1);

      expect(collections).toHaveLength(2);
      expect(collections[0]).toHaveProperty('key', 'col1');
      expect(collections[0]).toHaveProperty('name', 'Collection 1');
    });

    test('should handle null collection gracefully', () => {
      global.Zotero = {
        Items: {
          get: jest.fn().mockReturnValue({
            getCollections: jest.fn().mockReturnValue(['col1', 'col2'])
          })
        },
        Collections: {
          get: jest.fn((key) => {
            if (key === 'col1') return { key: 'col1', name: 'Collection 1' };
            return null; // col2 doesn't exist
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const collections = manager.getCollectionsForItem(1);

      expect(collections).toHaveLength(1);
      expect(collections[0].key).toBe('col1');
    });

    test('should rethrow error with context', () => {
      global.Zotero = {
        Items: {
          get: jest.fn().mockImplementation(() => {
            throw new Error('DB error');
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getCollectionsForItem(1))
        .toThrow('Failed to get collections for item: DB error');
    });
  });

  describe('getAllItems', () => {
    test('should throw error when Zotero is undefined', () => {
      delete global.Zotero;
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getAllItems())
        .toThrow('Zotero context is undefined');
    });

    test('should return all items', () => {
      const mockItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
      global.Zotero = {
        Libraries: {
          userLibraryID: 1
        },
        Items: {
          getAll: jest.fn().mockReturnValue(mockItems)
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const items = manager.getAllItems();

      expect(items).toEqual(mockItems);
      expect(global.Zotero.Items.getAll).toHaveBeenCalledWith(1);
    });

    test('should rethrow error with context', () => {
      global.Zotero = {
        Libraries: {
          userLibraryID: 1
        },
        Items: {
          getAll: jest.fn().mockImplementation(() => {
            throw new Error('DB error');
          })
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      expect(() => manager.getAllItems())
        .toThrow('Failed to get all items: DB error');
    });
  });

  describe('Method signature verification (mock Zotero)', () => {
    test('should work with mock Zotero object', () => {
      // Create a properly structured mock Zotero
      global.Zotero = {
        Libraries: {
          userLibraryID: 1
        },
        Collections: {
          get: jest.fn().mockReturnValue([
            { key: 'col1', name: 'Test Collection', parentKey: null }
          ])
        },
        Items: {
          get: jest.fn().mockReturnValue({
            getCollections: jest.fn().mockReturnValue(['col1'])
          }),
          getAll: jest.fn().mockReturnValue([])
        }
      };

      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      // Test method signatures
      const isAvailable = manager.isZoteroAvailable();
      const collections = manager.getAvailableCollections();
      const allItems = manager.getAllItems();

      expect(isAvailable).toBe(true);
      expect(Array.isArray(collections)).toBe(true);
      expect(Array.isArray(allItems)).toBe(true);
    });

    test('should handle method calls in correct order', () => {
      const callOrder = [];

      global.Zotero = {
        Libraries: {
          userLibraryID: 1
        },
        Collections: {
          get: jest.fn().mockImplementation(() => {
            callOrder.push('Collections.get');
            return [];
          })
        },
        Items: {
          getAll: jest.fn().mockImplementation(() => {
            callOrder.push('Items.getAll');
            return [];
          })
        }
      };

      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      manager.getAvailableCollections();
      manager.getAllItems();

      expect(callOrder).toEqual(['Collections.get', 'Items.getAll']);
    });
  });

  describe('Library-aware operations (Group Library Support)', () => {
    describe('getAvailableCollections with libraryID filter', () => {
      test('should filter collections by libraryID', () => {
        global.Zotero = {
          Collections: {
            get: jest.fn().mockReturnValue([
              { key: 'col1', name: 'Collection 1', libraryID: 1, parentKey: null },
              { key: 'col2', name: 'Collection 2', libraryID: 1, parentKey: null },
              { key: 'col3', name: 'Collection 3', libraryID: 2, parentKey: null }
            ])
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const collections = manager.getAvailableCollections(1);

        expect(collections).toHaveLength(2);
        expect(collections.every(c => c.libraryID === 1)).toBe(true);
      });

      test('should include libraryID in returned collections', () => {
        global.Zotero = {
          Collections: {
            get: jest.fn().mockReturnValue([
              { key: 'col1', name: 'Collection 1', libraryID: 2, parentKey: null }
            ])
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const collections = manager.getAvailableCollections();

        expect(collections[0]).toHaveProperty('libraryID', 2);
      });
    });

    describe('getAllItemsInLibrary', () => {
      test('should throw error when libraryID is not provided', () => {
        global.Zotero = {
          Items: {
            getAll: jest.fn()
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        expect(() => manager.getAllItemsInLibrary())
          .toThrow('libraryID is required');
        expect(() => manager.getAllItemsInLibrary(null))
          .toThrow('libraryID is required');
        expect(() => manager.getAllItemsInLibrary(undefined))
          .toThrow('libraryID is required');
      });

      test('should call Zotero.Items.getAll with libraryID', () => {
        const mockItems = [{ id: 1 }, { id: 2 }];
        global.Zotero = {
          Items: {
            getAll: jest.fn().mockReturnValue(mockItems)
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const items = manager.getAllItemsInLibrary(2);

        expect(items).toEqual(mockItems);
        expect(global.Zotero.Items.getAll).toHaveBeenCalledWith(2, false, false);
      });

      test('should pass options to Zotero.Items.getAll', () => {
        const mockItems = [{ id: 1 }];
        global.Zotero = {
          Items: {
            getAll: jest.fn().mockReturnValue(mockItems)
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        manager.getAllItemsInLibrary(2, { onlyTopLevel: true, includeDeleted: true });

        expect(global.Zotero.Items.getAll).toHaveBeenCalledWith(2, true, true);
      });

      test('should throw error when Zotero is undefined', () => {
        delete global.Zotero;
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        expect(() => manager.getAllItemsInLibrary(1))
          .toThrow('Zotero context is undefined');
      });
    });

    describe('getItemsByLibrary', () => {
      test('should throw error when libraryID is not provided', async () => {
        global.Zotero = {
          Items: {
            getAll: jest.fn()
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        await expect(manager.getItemsByLibrary())
          .rejects.toThrow('libraryID is required');
      });

      test('should get all items in library when no collectionKey specified', async () => {
        const mockItems = [{ id: 1 }, { id: 2 }];
        global.Zotero = {
          Items: {
            getAll: jest.fn().mockReturnValue(mockItems)
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const items = await manager.getItemsByLibrary(2);

        expect(items).toEqual(mockItems);
      });

      test('should get items from specific collection when collectionKey specified', async () => {
        const mockItems = [{ id: 1 }];
        global.Zotero = {
          Collections: {
            get: jest.fn().mockReturnValue({
              getItems: jest.fn().mockReturnValue(mockItems)
            })
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const items = await manager.getItemsByLibrary(2, 'ABC123');

        expect(items).toEqual(mockItems);
      });
    });

    describe('createLibraryScopedSearch', () => {
      test('should create search with libraryID condition', () => {
        const mockSearch = {
          addCondition: jest.fn()
        };
        global.Zotero = {
          Search: jest.fn().mockImplementation(() => mockSearch)
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const search = manager.createLibraryScopedSearch(2);

        expect(global.Zotero.Search).toHaveBeenCalled();
        expect(mockSearch.addCondition).toHaveBeenCalledWith('libraryID', 'is', 2);
        expect(search).toBe(mockSearch);
      });

      test('should throw error when Zotero is undefined', () => {
        delete global.Zotero;
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        expect(() => manager.createLibraryScopedSearch(1))
          .toThrow('Zotero context is undefined');
      });
    });

    describe('searchItemsInLibrary', () => {
      test('should search items with library scope', async () => {
        const mockSearch = {
          addCondition: jest.fn(),
          search: jest.fn().mockResolvedValue([1, 2, 3])
        };
        const mockItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
        global.Zotero = {
          Search: jest.fn().mockImplementation(() => mockSearch),
          Items: {
            get: jest.fn().mockReturnValue(mockItems)
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        // searchConditions format: { fieldName: [operator, value] }
        const items = await manager.searchItemsInLibrary(2, {
          title: ['contains', 'test']
        });

        expect(items).toEqual(mockItems);
        expect(mockSearch.addCondition).toHaveBeenCalledWith('libraryID', 'is', 2);
        expect(mockSearch.addCondition).toHaveBeenCalledWith('title', 'contains', 'test');
      });

      test('should handle empty search conditions', async () => {
        const mockSearch = {
          addCondition: jest.fn(),
          search: jest.fn().mockResolvedValue([1, 2])
        };
        const mockItems = [{ id: 1 }, { id: 2 }];
        global.Zotero = {
          Search: jest.fn().mockImplementation(() => mockSearch),
          Items: {
            get: jest.fn().mockReturnValue(mockItems)
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        await manager.searchItemsInLibrary(2);

        expect(mockSearch.addCondition).toHaveBeenCalledWith('libraryID', 'is', 2);
      });

      test('should handle object-format search conditions', async () => {
        const mockSearch = {
          addCondition: jest.fn(),
          search: jest.fn().mockResolvedValue([1])
        };
        const mockItems = [{ id: 1 }];
        global.Zotero = {
          Search: jest.fn().mockImplementation(() => mockSearch),
          Items: {
            get: jest.fn().mockReturnValue(mockItems)
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        await manager.searchItemsInLibrary(2, {
          title: { operator: 'contains', value: 'test' }
        });

        expect(mockSearch.addCondition).toHaveBeenCalledWith('title', 'contains', 'test');
      });
    });

    describe('getCollectionsForItem with libraryID', () => {
      test('should include libraryID in returned collections', () => {
        global.Zotero = {
          Items: {
            get: jest.fn().mockReturnValue({
              getCollections: jest.fn().mockReturnValue(['col1'])
            })
          },
          Collections: {
            get: jest.fn().mockReturnValue({
              key: 'col1',
              name: 'Collection 1',
              libraryID: 2
            })
          }
        };
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const collections = manager.getCollectionsForItem(1);

        expect(collections[0]).toHaveProperty('libraryID', 2);
      });
    });

    describe('getAllLibraries and getCurrentLibraryContext delegation', () => {
      test('should delegate getAllLibraries to LibraryContextManager', async () => {
        const mockLibraries = [
          { libraryID: 1, libraryType: 'user', name: 'My Library', editable: true }
        ];
        
        // Mock LibraryContextManager
        global.Zotero = {
          Libraries: {
            getAll: jest.fn().mockReturnValue(mockLibraries)
          }
        };
        
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        const libraries = await manager.getAllLibraries();

        expect(libraries).toEqual(mockLibraries);
      });

      test('should delegate getCurrentLibraryContext to LibraryContextManager', async () => {
        const mockContext = {
          libraryID: 2,
          libraryType: 'group',
          libraryName: 'Research Team'
        };
        
        global.Zotero = {
          Libraries: {
            userLibraryID: 1,
            get: jest.fn().mockReturnValue({
              libraryID: 1,
              libraryType: 'user',
              name: 'My Library'
            })
          }
        };
        
        const CM = require('../../src/zotero/collection-manager.js');
        const manager = new CM();

        // When ZoteroPane is not available, should return user library
        const context = await manager.getCurrentLibraryContext();

        expect(context).toHaveProperty('libraryID');
        expect(context).toHaveProperty('libraryType');
        expect(context).toHaveProperty('libraryName');
      });
    });
  });
});
