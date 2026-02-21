/**
 * Unit tests for LibraryContextManager
 * Tests library context detection and library listing functionality
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('LibraryContextManager', () => {
  let LibraryContextManager;
  let manager;

  // Store original Zotero reference
  const originalZotero = typeof global.Zotero !== 'undefined' ? global.Zotero : undefined;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    
    // Re-mock console
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    LibraryContextManager = require('../../src/zotero/library-context-manager.js');
    manager = new LibraryContextManager();
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
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      expect(mgr.isZoteroAvailable()).toBe(false);
    });

    test('should return false when Zotero is null', () => {
      global.Zotero = null;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      expect(mgr.isZoteroAvailable()).toBe(false);
    });

    test('should return true when Zotero is defined', () => {
      global.Zotero = { test: true };
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      expect(mgr.isZoteroAvailable()).toBe(true);
    });
  });

  describe('getZoteroPane', () => {
    test('should return null when Zotero is undefined', () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      expect(mgr.getZoteroPane()).toBeNull();
    });

    test('should return null when ZoteroPane is not available', () => {
      global.Zotero = { test: true };
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      expect(mgr.getZoteroPane()).toBeNull();
    });

    test('should return ZoteroPane when available', () => {
      const mockPane = { selected: true };
      global.Zotero = { test: true };
      global.ZoteroPane = mockPane;
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      expect(mgr.getZoteroPane()).toBe(mockPane);
    });

    test('should return current ZoteroPane reference (no caching)', () => {
      const mockPane = { selected: true };
      global.Zotero = { test: true };
      global.ZoteroPane = mockPane;

      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      // First call
      const firstResult = mgr.getZoteroPane();
      expect(firstResult).toBe(mockPane);

      // Change ZoteroPane
      global.ZoteroPane = { different: true };

      // Should return new reference (no caching)
      expect(mgr.getZoteroPane()).toBe(global.ZoteroPane);
    });
  });

  describe('getCurrentLibraryContext', () => {
    test('should throw error when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getCurrentLibraryContext()).rejects.toThrow('Zotero context is undefined');
    });

    test('should return user library when ZoteroPane is not available', async () => {
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
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const context = await mgr.getCurrentLibraryContext();

      expect(context).toEqual({
        libraryID: 1,
        libraryType: 'user',
        libraryName: 'My Library'
      });
    });

    test('should return user library when no collection is selected', async () => {
      const mockPane = {
        getSelectedCollection: jest.fn().mockReturnValue(null),
        getSelectedItems: jest.fn().mockReturnValue([])
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
      global.ZoteroPane = mockPane;
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const context = await mgr.getCurrentLibraryContext();

      expect(context).toEqual({
        libraryID: 1,
        libraryType: 'user',
        libraryName: 'My Library'
      });
    });

    test('should detect collection selection with library context', async () => {
      const mockCollection = {
        key: 'ABC123',
        name: 'Test Collection',
        libraryID: 2
      };
      
      const mockPane = {
        getSelectedCollection: jest.fn().mockReturnValue(mockCollection),
        getSelectedItems: jest.fn()
      };
      
      global.Zotero = {
        Libraries: {
          userLibraryID: 1,
          get: jest.fn().mockImplementation((libID) => {
            if (libID === 2) {
              return { libraryID: 2, libraryType: 'group', name: 'Research Team' };
            }
            return { libraryID: 1, libraryType: 'user', name: 'My Library' };
          })
        }
      };
      global.ZoteroPane = mockPane;
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const context = await mgr.getCurrentLibraryContext();

      expect(context).toEqual({
        libraryID: 2,
        libraryType: 'group',
        libraryName: 'Research Team',
        collectionKey: 'ABC123',
        collectionName: 'Test Collection'
      });
    });

    test('should detect library from selected items', async () => {
      const mockItem = {
        libraryID: 2
      };
      
      const mockPane = {
        getSelectedCollection: jest.fn().mockReturnValue(null),
        getSelectedItems: jest.fn().mockReturnValue([mockItem])
      };
      
      global.Zotero = {
        Libraries: {
          userLibraryID: 1,
          get: jest.fn().mockImplementation((libID) => {
            if (libID === 2) {
              return { libraryID: 2, libraryType: 'group', name: 'Research Team' };
            }
            return { libraryID: 1, libraryType: 'user', name: 'My Library' };
          })
        }
      };
      global.ZoteroPane = mockPane;
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const context = await mgr.getCurrentLibraryContext();

      expect(context).toEqual({
        libraryID: 2,
        libraryType: 'group',
        libraryName: 'Research Team'
      });
    });

    test('should fallback to user library on error', async () => {
      const mockPane = {
        getSelectedCollection: jest.fn().mockImplementation(() => {
          throw new Error('Pane error');
        })
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
      global.ZoteroPane = mockPane;
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const context = await mgr.getCurrentLibraryContext();

      // Should fallback to user library
      expect(context).toEqual({
        libraryID: 1,
        libraryType: 'user',
        libraryName: 'My Library'
      });
    });
  });

  describe('getAllLibraries', () => {
    test('should throw error when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getAllLibraries()).rejects.toThrow('Zotero context is undefined');
    });

    test('should return all libraries sorted with user library first', async () => {
      global.Zotero = {
        Libraries: {
          getAll: jest.fn().mockReturnValue([
            { libraryID: 1, libraryType: 'user', name: 'My Library', editable: true },
            { libraryID: 2, libraryType: 'group', name: 'Research Team', editable: true },
            { libraryID: 3, libraryType: 'group', name: 'Lab Publications', editable: false }
          ])
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const libraries = await mgr.getAllLibraries();

      expect(libraries).toHaveLength(3);
      expect(libraries[0]).toEqual({
        libraryID: 1,
        libraryType: 'user',
        name: 'My Library',
        editable: true
      });
      expect(libraries[1]).toEqual({
        libraryID: 2,
        libraryType: 'group',
        name: 'Research Team',
        editable: true
      });
      expect(libraries[2]).toEqual({
        libraryID: 3,
        libraryType: 'group',
        name: 'Lab Publications',
        editable: false
      });
    });

    test('should rethrow error with context', async () => {
      global.Zotero = {
        Libraries: {
          getAll: jest.fn().mockImplementation(() => {
            throw new Error('DB error');
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getAllLibraries()).rejects.toThrow('Failed to get libraries: DB error');
    });
  });

  describe('getLibrary', () => {
    test('should throw error when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getLibrary(1)).rejects.toThrow('Zotero context is undefined');
    });

    test('should throw error when library not found', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockReturnValue(null)
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getLibrary(999)).rejects.toThrow('Library not found: 999');
    });

    test('should return library details', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockReturnValue({
            libraryID: 2,
            libraryType: 'group',
            name: 'Research Team',
            editable: true
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const library = await mgr.getLibrary(2);

      expect(library).toEqual({
        libraryID: 2,
        libraryType: 'group',
        name: 'Research Team',
        editable: true
      });
    });
  });

  describe('getCollectionsInLibrary', () => {
    test('should throw error when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getCollectionsInLibrary(1)).rejects.toThrow('Zotero context is undefined');
    });

    test('should return collections filtered by libraryID', async () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue([
            { key: 'col1', name: 'Collection 1', libraryID: 1, parentKey: null },
            { key: 'col2', name: 'Collection 2', libraryID: 1, parentKey: 'col1' },
            { key: 'col3', name: 'Collection 3', libraryID: 2, parentKey: null } // Different library
          ])
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const collections = await mgr.getCollectionsInLibrary(1);

      expect(collections).toHaveLength(2);
      expect(collections[0]).toEqual({
        key: 'col1',
        name: 'Collection 1',
        parentKey: null
      });
      expect(collections[1]).toEqual({
        key: 'col2',
        name: 'Collection 2',
        parentKey: 'col1'
      });
    });

    test('should return empty array when no collections in library', async () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue([
            { key: 'col3', name: 'Collection 3', libraryID: 2, parentKey: null }
          ])
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const collections = await mgr.getCollectionsInLibrary(1);

      expect(collections).toEqual([]);
    });
  });

  describe('getLibraryIDForCollection', () => {
    test('should throw error when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getLibraryIDForCollection('col1')).rejects.toThrow('Zotero context is undefined');
    });

    test('should throw error when collection not found', async () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue(null)
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.getLibraryIDForCollection('nonexistent')).rejects.toThrow('Collection not found: nonexistent');
    });

    test('should return libraryID for collection', async () => {
      global.Zotero = {
        Collections: {
          get: jest.fn().mockReturnValue({
            key: 'col1',
            name: 'Collection 1',
            libraryID: 2
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const libraryID = await mgr.getLibraryIDForCollection('col1');

      expect(libraryID).toBe(2);
    });
  });

  describe('showLibrarySelector', () => {
    test('should throw error when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      await expect(mgr.showLibrarySelector()).rejects.toThrow('Zotero context is undefined');
    });

    test('should return single library directly when only one available', async () => {
      global.Zotero = {
        Libraries: {
          userLibraryID: 1,
          getAll: jest.fn().mockReturnValue([
            { libraryID: 1, libraryType: 'user', name: 'My Library', editable: true }
          ])
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const result = await mgr.showLibrarySelector();

      expect(result).toEqual({
        libraryID: 1,
        libraryType: 'user'
      });
    });

    test('should filter libraries based on options', async () => {
      global.Zotero = {
        Libraries: {
          userLibraryID: 1,
          getAll: jest.fn().mockReturnValue([
            { libraryID: 1, libraryType: 'user', name: 'My Library', editable: true },
            { libraryID: 2, libraryType: 'group', name: 'Research Team', editable: true },
            { libraryID: 3, libraryType: 'feed', name: 'ArXiv', editable: false }
          ])
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      // Include user library and groups, but not feeds
      const result = await mgr.showLibrarySelector({ includeFeeds: false });

      // Should default to user library when multiple options available
      expect(result).toEqual({
        libraryID: 1,
        libraryType: 'user'
      });
    });

    test('should exclude user library when requested', async () => {
      global.Zotero = {
        Libraries: {
          userLibraryID: 1,
          getAll: jest.fn().mockReturnValue([
            { libraryID: 1, libraryType: 'user', name: 'My Library', editable: true },
            { libraryID: 2, libraryType: 'group', name: 'Research Team', editable: true }
          ])
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const result = await mgr.showLibrarySelector({ includeUserLibrary: false });

      // Should return group library since user library is excluded
      expect(result).toEqual({
        libraryID: 2,
        libraryType: 'group'
      });
    });
  });

  describe('validateLibraryID', () => {
    test('should return false when Zotero is undefined', async () => {
      delete global.Zotero;
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const valid = await mgr.validateLibraryID(1);

      expect(valid).toBe(false);
    });

    test('should return true for valid library ID', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockReturnValue({
            libraryID: 1,
            libraryType: 'user',
            name: 'My Library'
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const valid = await mgr.validateLibraryID(1);

      expect(valid).toBe(true);
    });

    test('should return false for invalid library ID', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockReturnValue(null)
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const valid = await mgr.validateLibraryID(999);

      expect(valid).toBe(false);
    });
  });

  describe('getLibraryDescription', () => {
    test('should return human-readable description for user library', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockReturnValue({
            libraryID: 1,
            libraryType: 'user',
            name: 'My Library',
            editable: true
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const description = await mgr.getLibraryDescription(1);

      expect(description).toBe('My Library');
    });

    test('should return human-readable description for group library', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockReturnValue({
            libraryID: 2,
            libraryType: 'group',
            name: 'Research Team',
            editable: true
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const description = await mgr.getLibraryDescription(2);

      expect(description).toBe('Group: Research Team');
    });

    test('should return fallback description on error', async () => {
      global.Zotero = {
        Libraries: {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Not found');
          })
        }
      };
      
      const LCM = require('../../src/zotero/library-context-manager.js');
      const mgr = new LCM();

      const description = await mgr.getLibraryDescription(999);

      expect(description).toBe('Library 999');
    });
  });
});
