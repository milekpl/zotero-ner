/**
 * Menu Integration - Adds menu items to Zotero interface
 */
class MenuIntegration {
  constructor() {
    this.itemProcessor = new (require('./item-processor.js'))();
    this.zoteroDBAnalyzer = new (require('./zotero-db-analyzer.js'))();
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
   * Initialize the menu integration
   */
  async initialize() {
    console.log('Initializing menu integration');
    // In a real Zotero extension, this would add menu items to Zotero's interface
    this.registerMenuItems();
  }

  /**
   * Register menu items with Zotero
   */
  registerMenuItems() {
    // This would register the actual menu items in Zotero
    // Add to Zotero Tools menu

    console.log('Registered menu items for data normalization');

    // Register field-specific menu items
    this.registerFieldMenuItems();
  }

  /**
   * Register field-specific menu items under Tools > Normalize Field Data
   * Creates submenu with Publisher, Location, and Journal normalization options
   */
  registerFieldMenuItems() {
    if (typeof Zotero === 'undefined') {
      console.log('Zotero context not available, skipping field menu registration');
      return;
    }

    try {
      const mainWindow = Zotero.getMainWindow();
      if (!mainWindow) {
        console.log('Could not get Zotero main window');
        return;
      }

      const doc = mainWindow.document;
      if (!doc) {
        console.log('Could not get main window document');
        return;
      }

      // Find the Tools menu
      const toolsMenu = doc.querySelector('#menu_ToolsPopup');
      if (!toolsMenu) {
        console.log('Could not find Tools menu');
        return;
      }

      // Add separator before the new entry
      const separator = doc.createElement('menuseparator');
      toolsMenu.appendChild(separator);

      // Single entry: opens the dialog with a field picker. The field-specific
      // heuristics (publisher/location/journal) are still applied automatically,
      // selected from whichever field the user picks in the dialog.
      const menuItem = doc.createElement('menuitem');
      menuItem.setAttribute('id', 'zotero-ner-normalize-field');
      menuItem.setAttribute('label', 'Normalize Field…');
      menuItem.addEventListener('command', async () => {
        await this.handleFieldNormalizeAction('__picker__');
      });
      toolsMenu.appendChild(menuItem);

      console.log('Registered field normalization menu item: Normalize Field…');
    } catch (error) {
      console.error('Error registering field menu items:', error);
    }
  }

  /**
   * Handle field-specific normalize action for selected items
   * Opens the dialog with field type parameter
   * @param {string} fieldType - Type of field to normalize (publisher, location, journal)
   * @returns {Promise<Object>} Result object with success/error status
   */
  async handleFieldNormalizeAction(fieldType) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }

    try {
      // Get selected items from Zotero
      const zoteroPane = Zotero.getActiveZoteroPane();
      if (!zoteroPane) {
        Zotero.alert(null, 'Zotero Name Normalizer', 'Could not get Zotero pane');
        return { success: false, error: 'Could not get Zotero pane' };
      }

      const items = zoteroPane.getSelectedItems();
      if (!items || items.length === 0) {
        Zotero.alert(null, 'Zotero Name Normalizer', 'Please select items to normalize');
        return { success: false, error: 'No items selected' };
      }

      console.log(`Handling ${fieldType} normalization for ${items.length} items`);

      // Open the field normalization dialog with field type parameter
      const mainWindow = Zotero.getMainWindow();
      if (!mainWindow) {
        Zotero.alert(null, 'Zotero Name Normalizer', 'Could not get main window');
        return { success: false, error: 'Could not get main window' };
      }

      // Get the current library context from Zotero UI
      const libraryContext = await this.libraryContextManager.getCurrentLibraryContext();
      console.log(`Field normalization context: ${libraryContext.libraryName}, collection: ${libraryContext.collectionKey || 'none'}`);

      // Pass items, fieldType, and libraryContext as dialog parameters
      const params = {
        items: items.map(item => item.id),  // Pass item IDs
        fieldType: fieldType,
        libraryContext: libraryContext
      };

      // Open the dialog - it will handle field normalization
      mainWindow.openDialog(
        'chrome://zoteronamenormalizer/content/dialog.html',
        'zotero-field-normalizer-dialog',
        'chrome,centerscreen,resizable=yes,width=750,height=550',
        params
      );

      return {
        success: true,
        message: `Opening ${fieldType} normalization dialog`
      };
    } catch (error) {
      Zotero.debug(`MenuIntegration: Error in handleFieldNormalizeAction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle normalize action for selected items
   * @param {Array} items - Selected Zotero items
   */
  async handleNormalizeAction(items) {
    try {
      console.log(`Handling normalize action for ${items.length} items`);

      // Process each selected item
      const results = [];
      for (const item of items) {
        const itemResults = await this.itemProcessor.processItemCreators(item);
        results.push({
          item: item,
          results: itemResults
        });
      }

      // Show the normalization dialog with results
      const normalizerDialog = new (require('../ui/normalizer-dialog.js'))();
      const userSelections = await normalizerDialog.showDialog(items);

      // Apply the user's selections
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const selections = userSelections[i];
        await this.itemProcessor.applyNormalizations(item, selections.creators);
      }

      return { success: true, processed: items.length };
    } catch (error) {
      Zotero.debug(`MenuIntegration: Error in handleNormalizeAction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform a full library analysis for name variants
   * Respects the currently selected library/collection in Zotero UI
   * @returns {Object} Analysis results
   */
  async performFullLibraryAnalysis() {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }

    try {
      // Get the current library context from Zotero UI
      const context = await this.libraryContextManager.getCurrentLibraryContext();
      
      console.log(`Starting analysis for ${context.libraryType === 'user' ? 'My Library' : context.libraryName}...`);
      
      let results;
      
      // If a collection is selected, analyze only that collection
      if (context.collectionKey) {
        console.log(`Analyzing collection: ${context.collectionName}`);
        results = await this.zoteroDBAnalyzer.analyzeCollection(context.collectionKey, {
          includeSubcollections: false
        });
      } else {
        // Analyze the entire library
        console.log(`Analyzing library: ${context.libraryName}`);
        results = await this.zoteroDBAnalyzer.analyzeLibrary(context.libraryID);
      }

      console.log(`Analysis complete: Found ${results.totalVariantGroups || 0} potential variant groups`);
      return results;
    } catch (error) {
      console.error('Error in library analysis:', error);
      throw error;
    }
  }

  /**
   * Handle full library analysis action
   */
  async handleFullLibraryAnalysis() {
    try {
      // Get context for user feedback
      const context = await this.libraryContextManager.getCurrentLibraryContext();
      const scopeDescription = context.collectionKey 
        ? `collection "${context.collectionName}" in ${context.libraryType === 'user' ? 'My Library' : context.libraryName}`
        : (context.libraryType === 'user' ? 'My Library' : context.libraryName);
      
      console.log(`Starting analysis of ${scopeDescription}...`);
      
      const results = await this.performFullLibraryAnalysis();

      // In a real implementation, this would show the results in a dedicated UI
      // For now, we'll just return the results
      console.log('Full library analysis results:', {
        scope: scopeDescription,
        totalUniqueSurnames: results.totalUniqueSurnames,
        totalVariantGroups: results.totalVariantGroups,
        topSuggestions: results.suggestions ? results.suggestions.slice(0, 10) : []
      });

      return results;
    } catch (error) {
      console.error('Error handling full library analysis:', error);
      throw error;
    }
  }

  /**
   * Apply normalization suggestions (called from dialog via window.opener)
   * @param {Array} suggestions - Array of normalization suggestions
   * @param {boolean} autoConfirm - Whether to auto-confirm all
   * @param {Object} options - Additional options including progressCallback
   * @returns {Object} Results of the normalization application
   */
  async applyNormalizationSuggestions(suggestions, autoConfirm = false, options = {}) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }

    console.log('Applying normalization suggestions for ' + suggestions.length + ' items');

    try {
      const results = await this.zoteroDBAnalyzer.applyNormalizationSuggestions(
        suggestions,
        autoConfirm,
        options
      );

      console.log('Normalization application complete:', results);
      return results;
    } catch (error) {
      console.error('Error applying normalization suggestions:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MenuIntegration;
}