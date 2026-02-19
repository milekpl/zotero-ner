/**
 * Collection Manager - Handles integration with Zotero collections
 * Supports library-aware operations for user and group libraries
 */
class CollectionManager {
  constructor() {
    this._libraryContextManager = null;
  }

  /**
   * Lazy getter for LibraryContextManager
   */
  get libraryContextManager() {
    if (!this._libraryContextManager) {
      const LibraryContextManager = require('./library-context-manager.js');
      this._libraryContextManager = new LibraryContextManager();
    }
    return this._libraryContextManager;
  }

  /**
   * Check if Zotero context is available
   * @returns {boolean} True if Zotero context exists
   */
  isZoteroAvailable() {
    return typeof Zotero !== 'undefined' && Zotero !== null;
  }

  /**
   * Get all available collections (optionally filtered by library)
   * @param {number|null} libraryID - Optional library ID to filter by
   * @returns {Array<{key: string, name: string, parentKey: string|null, libraryID: number}>}
   * @throws {Error} If Zotero context is undefined
   */
  getAvailableCollections(libraryID = null) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const collections = Zotero.Collections.get();
      const result = [];

      for (const collection of collections) {
        // Filter by libraryID if specified
        if (libraryID !== null && collection.libraryID !== libraryID) {
          continue;
        }

        result.push({
          key: collection.key,
          name: collection.name,
          parentKey: collection.parentKey || null,
          libraryID: collection.libraryID
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get collections: ${error.message}`);
    }
  }

  /**
   * Get items in a specific collection
   * @param {string} collectionKey - Collection key
   * @param {Object} options - Options
   * @param {boolean} options.includeSubcollections - Include items from subcollections (default: false)
   * @returns {Array} Array of items in the collection
   * @throws {Error} If Zotero context is undefined
   */
  getItemsInCollection(collectionKey, options = {}) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    const { includeSubcollections = false } = options;

    try {
      const collection = Zotero.Collections.get(collectionKey);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionKey}`);
      }

      if (includeSubcollections) {
        // Get items from collection and all subcollections
        return collection.getItems(true); // true = include subcollections
      } else {
        return collection.getItems();
      }
    } catch (error) {
      throw new Error(`Failed to get items in collection: ${error.message}`);
    }
  }

  /**
   * Get all items in a specific library
   * @param {number} libraryID - The library ID to get items from
   * @param {Object} options - Options
   * @param {boolean} options.onlyTopLevel - Only get top-level items (default: false)
   * @param {boolean} options.includeDeleted - Include deleted items (default: false)
   * @returns {Array} Array of items in the library
   * @throws {Error} If Zotero context is undefined
   */
  getAllItemsInLibrary(libraryID, options = {}) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    if (libraryID === null || libraryID === undefined) {
      throw new Error('libraryID is required');
    }

    const { onlyTopLevel = false, includeDeleted = false } = options;

    try {
      return Zotero.Items.getAll(libraryID, onlyTopLevel, includeDeleted);
    } catch (error) {
      throw new Error(`Failed to get all items in library ${libraryID}: ${error.message}`);
    }
  }

  /**
   * Get items by library and optionally filtered by collection
   * @param {number} libraryID - The library ID
   * @param {string|null} collectionKey - Optional collection key to filter by
   * @param {Object} options - Options
   * @returns {Promise<Array>} Array of items
   * @throws {Error} If Zotero context is undefined
   */
  async getItemsByLibrary(libraryID, collectionKey = null, options = {}) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    if (libraryID === null || libraryID === undefined) {
      throw new Error('libraryID is required');
    }

    try {
      // If collectionKey is specified, get items from that collection
      if (collectionKey) {
        return this.getItemsInCollection(collectionKey, options);
      }

      // Otherwise, get all items in the library
      return this.getAllItemsInLibrary(libraryID, options);
    } catch (error) {
      throw new Error(`Failed to get items from library ${libraryID}: ${error.message}`);
    }
  }

  /**
   * Get collections for a specific item
   * @param {number} itemID - Item ID
   * @returns {Array<{key: string, name: string, libraryID: number}>} Collections containing the item
   * @throws {Error} If Zotero context is undefined
   */
  getCollectionsForItem(itemID) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const item = Zotero.Items.get(itemID);
      if (!item) {
        throw new Error(`Item not found: ${itemID}`);
      }

      const collectionKeys = item.getCollections();
      const result = [];

      for (const key of collectionKeys) {
        const collection = Zotero.Collections.get(key);
        if (collection) {
          result.push({
            key: collection.key,
            name: collection.name,
            libraryID: collection.libraryID
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get collections for item: ${error.message}`);
    }
  }

  /**
   * Get all items in the library (legacy method, defaults to user library)
   * @deprecated Use getAllItemsInLibrary(libraryID) instead
   * @returns {Array} All library items (user library)
   * @throws {Error} If Zotero context is undefined
   */
  getAllItems() {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      // Default to user library for backward compatibility
      return Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
    } catch (error) {
      throw new Error(`Failed to get all items: ${error.message}`);
    }
  }

  /**
   * Get the current library context from Zotero UI
   * @returns {Promise<{libraryID: number, libraryType: string, libraryName: string, collectionKey?: string}>}
   */
  async getCurrentLibraryContext() {
    return this.libraryContextManager.getCurrentLibraryContext();
  }

  /**
   * Get all accessible libraries
   * @returns {Promise<Array<{libraryID: number, libraryType: string, name: string, editable: boolean}>>}
   */
  async getAllLibraries() {
    return this.libraryContextManager.getAllLibraries();
  }

  /**
   * Build a Zotero.Search scoped to a specific library
   * @param {number} libraryID - The library ID to scope the search to
   * @returns {Object} Zotero.Search object
   * @throws {Error} If Zotero context is undefined
   */
  createLibraryScopedSearch(libraryID) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    const search = new Zotero.Search();
    search.addCondition('libraryID', 'is', libraryID);
    return search;
  }

  /**
   * Get items matching a search within a specific library
   * @param {number} libraryID - The library ID
   * @param {Object} searchConditions - Conditions to add to the search
   *   Format: { fieldName: [operator, value] } or { fieldName: {operator, value} }
   * @returns {Promise<Array>} Array of items matching the search
   * @throws {Error} If Zotero context is undefined
   */
  async searchItemsInLibrary(libraryID, searchConditions = {}) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const search = this.createLibraryScopedSearch(libraryID);

      // Add additional conditions
      for (const [field, condition] of Object.entries(searchConditions)) {
        if (Array.isArray(condition)) {
          // Format: [operator, value]
          search.addCondition(field, ...condition);
        } else if (condition && typeof condition === 'object') {
          // Format: {operator, value}
          search.addCondition(field, condition.operator, condition.value);
        }
      }

      const itemIDs = await search.search();
      return Zotero.Items.get(itemIDs);
    } catch (error) {
      throw new Error(`Failed to search items in library ${libraryID}: ${error.message}`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollectionManager;
}
