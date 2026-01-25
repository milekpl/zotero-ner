/**
 * Menu Integration - Adds menu items to Zotero interface
 */
class MenuIntegration {
  constructor() {
    this.itemProcessor = new (require('./item-processor.js'))();
    this.zoteroDBAnalyzer = new (require('./zotero-db-analyzer.js'))();
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
    // Examples: 
    // - Right-click context menu on items
    // - Tools menu option
    // - Item pane button
    
    console.log('Registered menu items for name normalization');
  }

  /**
   * Handle normalize action for selected items
   * @param {Array} items - Selected Zotero items
   */
  async handleNormalizeAction(items) {
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
  }

  /**
   * Perform a full library analysis for name variants
   * @returns {Object} Analysis results
   */
  async performFullLibraryAnalysis() {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }
    
    console.log('Starting full library analysis for name variants...');
    
    try {
      const results = await this.zoteroDBAnalyzer.analyzeFullLibrary();
      
      console.log(`Analysis complete: Found ${results.totalVariantGroups} potential variant groups`);
      return results;
    } catch (error) {
      console.error('Error in full library analysis:', error);
      throw error;
    }
  }

  /**
   * Handle full library analysis action
   */
  async handleFullLibraryAnalysis() {
    try {
      const results = await this.performFullLibraryAnalysis();

      // In a real implementation, this would show the results in a dedicated UI
      // For now, we'll just return the results
      console.log('Full library analysis results:', {
        totalUniqueSurnames: results.totalUniqueSurnames,
        totalVariantGroups: results.totalVariantGroups,
        topSuggestions: results.suggestions.slice(0, 10) // First 10 suggestions
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