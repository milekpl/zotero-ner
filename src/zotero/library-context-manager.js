/**
 * Library Context Manager - Handles detection and selection of library context
 * 
 * This module provides functionality to:
 * - Detect the currently selected library in Zotero's UI
 * - List all accessible libraries (user + groups)
 * - Resolve collection → library mappings
 * - Provide library selection UI
 */
class LibraryContextManager {
  constructor() {
    this._zoteroPane = null;
  }

  /**
   * Check if Zotero context is available
   * @returns {boolean} True if Zotero context exists
   */
  isZoteroAvailable() {
    return typeof Zotero !== 'undefined' && Zotero !== null;
  }

  /**
   * Get the ZoteroPane singleton
   * @returns {Object|null} ZoteroPane object or null if unavailable
   */
  getZoteroPane() {
    if (!this.isZoteroAvailable()) {
      return null;
    }

    if (!this._zoteroPane) {
      try {
        // ZoteroPane is available after Zotero initializes
        this._zoteroPane = ZoteroPane || (Zotero.getActiveZoteroPane && Zotero.getActiveZoteroPane());
      } catch (e) {
        console.warn('LibraryContextManager: Could not get ZoteroPane:', e);
        this._zoteroPane = null;
      }
    }

    return this._zoteroPane;
  }

  /**
   * Get library context without ZoteroPane - uses Zotero's main window state
   * This is a fallback when ZoteroPane is not available
   * @returns {Object|null} Library context or null if unavailable
   */
  getLibraryContextFromView() {
    if (!this.isZoteroAvailable()) {
      return null;
    }

    try {
      // Try multiple approaches to get the current library/collection

      // Approach 1: Try Zotero.getActiveZoteroPane()
      try {
        const zoteroPane = Zotero.getActiveZoteroPane && Zotero.getActiveZoteroPane();
        if (zoteroPane) {
          const collection = zoteroPane.getSelectedCollection && zoteroPane.getSelectedCollection();
          if (collection) {
            const library = Zotero.Libraries.get(collection.libraryID);
            return {
              libraryID: collection.libraryID,
              libraryType: library.libraryType,
              libraryName: library.name,
              collectionKey: collection.key,
              collectionName: collection.name
            };
          }

          // Try to get from selected items
          const items = zoteroPane.getSelectedItems && zoteroPane.getSelectedItems();
          if (items && items.length > 0) {
            const firstItem = items[0];
            const library = Zotero.Libraries.get(firstItem.libraryID);
            return {
              libraryID: firstItem.libraryID,
              libraryType: library.libraryType,
              libraryName: library.name
            };
          }
        }
      } catch (e) {
        // Continue to next approach
      }

      // Approach 2: Try to get from main window's ZoteroPane
      try {
        const mainWindow = Zotero.getMainWindow && Zotero.getMainWindow();
        if (mainWindow) {
          const zoteroPane = mainWindow.ZoteroPane;
          if (zoteroPane) {
            const collection = zoteroPane.getSelectedCollection && zoteroPane.getSelectedCollection();
            if (collection) {
              const library = Zotero.Libraries.get(collection.libraryID);
              return {
                libraryID: collection.libraryID,
                libraryType: library.libraryType,
                libraryName: library.name,
                collectionKey: collection.key,
                collectionName: collection.name
              };
            }
          }
        }
      } catch (e) {
        // Continue to next approach
      }

      // Approach 3: Try to get from window's current view state (for Zotero 7)
      try {
        const mainWindow = Zotero.getMainWindow && Zotero.getMainWindow();
        if (mainWindow) {
          // Check for various state properties that might contain current selection
          if (mainWindow.zoteroState) {
            const state = mainWindow.zoteroState;
            if (state.selectedCollection) {
              const collection = Zotero.Collections.getByKey && Zotero.Collections.getByKey(state.selectedCollection);
              if (collection) {
                const library = Zotero.Libraries.get(collection.libraryID);
                return {
                  libraryID: collection.libraryID,
                  libraryType: library.libraryType,
                  libraryName: library.name,
                  collectionKey: collection.key,
                  collectionName: collection.name
                };
              }
            }
          }
        }
      } catch (e) {
        // Continue
      }

      return null;
    } catch (e) {
      console.warn('LibraryContextManager: Error getting context from view:', e);
      return null;
    }
  }

  /**
   * Get the currently selected library context from Zotero UI
   *
   * Detects which library/collection is currently selected in Zotero's UI:
   * - If a collection is selected, returns that collection's library
   * - If a library is selected, returns that library
   * - If items are selected, returns the library containing those items
   * - Defaults to user library if nothing specific is selected
   *
   * This follows the same pattern as zotero-search-replace plugin.
   *
   * @returns {Promise<{libraryID: number, libraryType: string, libraryName: string, collectionKey?: string, collectionName?: string}>}
   * @throws {Error} If Zotero context is unavailable
   */
  async getCurrentLibraryContext() {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const zoteroPane = this.getZoteroPane();

      if (!zoteroPane) {
        // Try fallback method to get library context from view
        const fallbackContext = this.getLibraryContextFromView();
        if (fallbackContext) {
          return fallbackContext;
        }

        // Final fallback: return user library if pane not available
        const userLib = Zotero.Libraries.get(Zotero.Libraries.userLibraryID);
        return {
          libraryID: Zotero.Libraries.userLibraryID,
          libraryType: 'user',
          libraryName: userLib.name
        };
      }

      // Get selected collection (standard Zotero pattern)
      const selectedCollection = zoteroPane.getSelectedCollection();

      if (selectedCollection) {
        // Collection is selected - get its library
        const library = Zotero.Libraries.get(selectedCollection.libraryID);
        return {
          libraryID: selectedCollection.libraryID,
          libraryType: library.libraryType,
          libraryName: library.name,
          collectionKey: selectedCollection.key,
          collectionName: selectedCollection.name
        };
      }

      // No collection selected - check if items are selected
      const selectedItems = zoteroPane.getSelectedItems();

      if (selectedItems && selectedItems.length > 0) {
        // Items are selected - use the library of the first selected item
        const firstItem = selectedItems[0];
        const library = Zotero.Libraries.get(firstItem.libraryID);
        return {
          libraryID: firstItem.libraryID,
          libraryType: library.libraryType,
          libraryName: library.name
        };
      }

      // Nothing selected - default to user library
      const userLib = Zotero.Libraries.get(Zotero.Libraries.userLibraryID);
      return {
        libraryID: Zotero.Libraries.userLibraryID,
        libraryType: 'user',
        libraryName: userLib.name
      };
    } catch (error) {
      console.error('LibraryContextManager: Error getting current library context:', error);
      // Fallback to user library on error
      try {
        const userLib = Zotero.Libraries.get(Zotero.Libraries.userLibraryID);
        return {
          libraryID: Zotero.Libraries.userLibraryID,
          libraryType: 'user',
          libraryName: userLib.name
        };
      } catch (fallbackError) {
        // If we can't even get user library, return minimal fallback
        return {
          libraryID: Zotero.Libraries.userLibraryID,
          libraryType: 'user',
          libraryName: 'My Library'
        };
      }
    }
  }

  /**
   * Get all accessible libraries
   * 
   * Returns all libraries the user has access to:
   * - User library (always first)
   * - Group libraries
   * - Feed libraries
   * - Publications library
   * 
   * @returns {Promise<Array<{libraryID: number, libraryType: string, name: string, editable: boolean}>>}
   * @throws {Error} If Zotero context is unavailable
   */
  async getAllLibraries() {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const libraries = Zotero.Libraries.getAll();
      const result = [];

      for (const library of libraries) {
        result.push({
          libraryID: library.libraryID,
          libraryType: library.libraryType,
          name: library.name,
          editable: library.editable
        });
      }

      return result;
    } catch (error) {
      console.error('LibraryContextManager: Error getting all libraries:', error);
      throw new Error(`Failed to get libraries: ${error.message}`);
    }
  }

  /**
   * Get a specific library by ID
   * 
   * @param {number} libraryID - The library ID to get
   * @returns {Promise<{libraryID: number, libraryType: string, name: string, editable: boolean}>}
   * @throws {Error} If library not found or Zotero context unavailable
   */
  async getLibrary(libraryID) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const library = Zotero.Libraries.get(libraryID);
      
      if (!library) {
        throw new Error(`Library not found: ${libraryID}`);
      }

      return {
        libraryID: library.libraryID,
        libraryType: library.libraryType,
        name: library.name,
        editable: library.editable
      };
    } catch (error) {
      console.error('LibraryContextManager: Error getting library:', error);
      throw new Error(`Failed to get library ${libraryID}: ${error.message}`);
    }
  }

  /**
   * Get collections in a specific library
   * 
   * @param {number} libraryID - The library ID to get collections from
   * @returns {Promise<Array<{key: string, name: string, parentKey: string|null}>>}
   * @throws {Error} If Zotero context is unavailable
   */
  async getCollectionsInLibrary(libraryID) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      // Get all collections and filter by libraryID
      const collections = Zotero.Collections.get();
      const result = [];

      for (const collection of collections) {
        if (collection.libraryID === libraryID) {
          result.push({
            key: collection.key,
            name: collection.name,
            parentKey: collection.parentKey || null
          });
        }
      }

      return result;
    } catch (error) {
      console.error('LibraryContextManager: Error getting collections:', error);
      throw new Error(`Failed to get collections in library ${libraryID}: ${error.message}`);
    }
  }

  /**
   * Get the library ID for a specific collection
   * 
   * @param {string} collectionKey - The collection key
   * @returns {Promise<number>} The library ID containing the collection
   * @throws {Error} If collection not found or Zotero context unavailable
   */
  async getLibraryIDForCollection(collectionKey) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    try {
      const collection = Zotero.Collections.get(collectionKey);
      
      if (!collection) {
        throw new Error(`Collection not found: ${collectionKey}`);
      }

      return collection.libraryID;
    } catch (error) {
      console.error('LibraryContextManager: Error getting library ID for collection:', error);
      throw new Error(`Failed to get library ID for collection ${collectionKey}: ${error.message}`);
    }
  }

  /**
   * Show library selection dialog
   * 
   * Presents a dialog allowing the user to select which library to operate on.
   * In actual Zotero extension, this would show a XUL/HTML dialog.
   * 
   * @param {Object} options - Dialog options
   * @param {boolean} options.includeUserLibrary - Include user library in selection (default: true)
   * @param {boolean} options.includeGroups - Include group libraries (default: true)
   * @param {boolean} options.includeFeeds - Include feed libraries (default: false)
   * @returns {Promise<{libraryID: number, libraryType: string} | null>} Selected library or null if cancelled
   * @throws {Error} If Zotero context is unavailable
   */
  async showLibrarySelector(options = {}) {
    if (!this.isZoteroAvailable()) {
      throw new Error('Zotero context is undefined');
    }

    const {
      includeUserLibrary = true,
      includeGroups = true,
      includeFeeds = false
    } = options;

    try {
      const allLibraries = await this.getAllLibraries();
      
      // Filter libraries based on options
      let filteredLibraries = allLibraries.filter(lib => {
        if (lib.libraryType === 'user') return includeUserLibrary;
        if (lib.libraryType === 'group') return includeGroups;
        if (lib.libraryType === 'feed') return includeFeeds;
        if (lib.libraryType === 'publications') return includeUserLibrary; // Treat publications with user library
        return false;
      });

      // If only one library available, return it directly
      if (filteredLibraries.length === 1) {
        return {
          libraryID: filteredLibraries[0].libraryID,
          libraryType: filteredLibraries[0].libraryType
        };
      }

      // In actual Zotero extension, show dialog here
      // For now, return the first library (user library) as default
      console.log('Library selector would show:', filteredLibraries);
      
      // Default to user library
      return {
        libraryID: Zotero.Libraries.userLibraryID,
        libraryType: 'user'
      };
    } catch (error) {
      console.error('LibraryContextManager: Error in library selector:', error);
      throw error;
    }
  }

  /**
   * Validate that a library ID is accessible
   * 
   * @param {number} libraryID - The library ID to validate
   * @returns {Promise<boolean>} True if library is accessible
   */
  async validateLibraryID(libraryID) {
    if (!this.isZoteroAvailable()) {
      return false;
    }

    try {
      const library = Zotero.Libraries.get(libraryID);
      return !!library;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get a human-readable description of a library
   * 
   * @param {number} libraryID - The library ID
   * @returns {Promise<string>} Human-readable library description
   */
  async getLibraryDescription(libraryID) {
    try {
      const library = await this.getLibrary(libraryID);
      
      const typeLabels = {
        'user': 'My Library',
        'group': 'Group',
        'feed': 'Feed',
        'publications': 'Publications'
      };

      const typeLabel = typeLabels[library.libraryType] || library.libraryType;
      
      if (library.libraryType === 'user' || library.libraryType === 'publications') {
        return typeLabel;
      }
      
      return `${typeLabel}: ${library.name}`;
    } catch (e) {
      return `Library ${libraryID}`;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LibraryContextManager;
}
