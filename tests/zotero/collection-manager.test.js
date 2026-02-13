/**
 * Unit tests for CollectionManager
 * Tests graceful handling of missing Zotero context and method signatures
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn()
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
      error: jest.fn()
    };
    // Clear console mocks
    console.log.mockClear();
    console.error.mockClear();
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
        Items: {
          getAll: jest.fn().mockReturnValue(mockItems)
        }
      };
      const CM = require('../../src/zotero/collection-manager.js');
      const manager = new CM();

      const items = manager.getAllItems();

      expect(items).toEqual(mockItems);
      expect(global.Zotero.Items.getAll).toHaveBeenCalled();
    });

    test('should rethrow error with context', () => {
      global.Zotero = {
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
});
