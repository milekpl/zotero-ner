/**
 * Collection Manager - Handles integration with Zotero collections
 */
class CollectionManager {
  /**
   * Check if Zotero context is available
   * @returns {boolean} True if Zotero context exists
   */
  isZoteroAvailable() {
    return typeof Zotero !== 'undefined' && Zotero !== null;
  }

  /**
   * Get all available collections
   * @returns {Array<{key: string, name: string, parentKey: string|null}>}
   * @throws {Error} If Zotero context is undefined
   */
  getAvailableCollections() {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const collections = Zotero.Collections.get();
      const result = [];

      for (const collection of collections) {
        result.push({
          key: collection.key,
          name: collection.name,
          parentKey: collection.parentKey || null
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get collections: ${error.message}`);
    }
  }

  /**
   * Get items in a specific collection
   * @param {string} collectionId - Collection ID or key
   * @returns {Array} Array of items in the collection
   * @throws {Error} If Zotero context is undefined
   */
  getItemsInCollection(collectionId) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const collection = Zotero.Collections.get(collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }
      return collection.getItems();
    } catch (error) {
      throw new Error(`Failed to get items in collection: ${error.message}`);
    }
  }

  /**
   * Get collections for a specific item
   * @param {string} itemId - Item ID
   * @returns {Array<{key: string, name: string}>} Collections containing the item
   * @throws {Error} If Zotero context is undefined
   */
  getCollectionsForItem(itemId) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const item = Zotero.Items.get(itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      const collectionKeys = item.getCollections();
      const result = [];

      for (const key of collectionKeys) {
        const collection = Zotero.Collections.get(key);
        if (collection) {
          result.push({
            key: collection.key,
            name: collection.name
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get collections for item: ${error.message}`);
    }
  }

  /**
   * Get all items in the library
   * @returns {Array} All library items
   * @throws {Error} If Zotero context is undefined
   */
  getAllItems() {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      return Zotero.Items.getAll();
    } catch (error) {
      throw new Error(`Failed to get all items: ${error.message}`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollectionManager;
}
