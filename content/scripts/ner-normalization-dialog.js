/**
 * NER Normalization Dialog Controller
 * Handles the UI logic for the name normalization dialog
 */

// Global namespace for the dialog
var ZoteroNER_NormalizationDialog = {
  items: [],
  currentItemIndex: 0,
  processedItems: [],
  skippedItems: [],
  normalizationResults: {},
  
  /**
   * Initialize the dialog
   */
  init: function() {
    Zotero.debug('ZoteroNER: Initializing normalization dialog');
    try {
      // Check if ZoteroNER object is available
      if (typeof ZoteroNER === 'undefined') {
        Zotero.debug('ZoteroNER: ZoteroNER object not found!');
        Zotero.alert(null, 'Error', 'ZoteroNER object not found. The bundled script may not be loaded correctly.');
        window.close();
        return;
      }

      // Get items from dialog arguments
      var params = window.arguments[0];
      if (params && params.items && params.items.length > 0) {
        this.items = params.items;
        Zotero.debug('ZoteroNER: Got ' + this.items.length + ' items from params');
      } else {
        Zotero.debug('ZoteroNER: No items selected, scanning library...');
        this.scanLibrary();
        return;
      }
      
      // Initialize the UI
      this.populateItemsList();
      this.updateProgress();
      
      // Start processing the first item
      this.processNextItem();
      
    } catch (e) {
      Zotero.logError(e);
      Zotero.alert(null, 'Error', 'Failed to initialize normalization dialog: ' + e.message);
      window.close();
    }
  },

  scanLibrary: async function() {
    Zotero.debug('ZoteroNER: Starting library scan');
    try {
      var allItems = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
      Zotero.debug('ZoteroNER: Found ' + allItems.length + ' items in the library');
      this.items = allItems.filter(item => item.isTopLevel() && item.getCreators().length > 0);
      Zotero.debug('ZoteroNER: Found ' + this.items.length + ' items with creators');

      // Initialize the UI
      this.populateItemsList();
      this.updateProgress();
      
      // Start processing the first item
      this.processNextItem();

    } catch (e) {
      Zotero.logError(e);
      Zotero.alert(null, 'Error', 'Failed to scan library: ' + e.message);
      window.close();
    }
  },
  
  /**
   * Populate the items list in the UI
   */
  populateItemsList: function() {
    var itemsList = document.getElementById('items-list');
    if (!itemsList) return;
    
    // Clear existing items
    while (itemsList.firstChild) {
      itemsList.removeChild(itemsList.firstChild);
    }
    
    // Add items to the list
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      var listItem = document.createXULElement('richlistitem');
      listItem.setAttribute('value', i);
      listItem.setAttribute('class', 'zotero-ner-item');
      
      // Create item content
      var vbox = document.createXULElement('vbox');
      
      var title = document.createXULElement('label');
      title.setAttribute('value', item.getField('title') || 'Untitled');
      title.setAttribute('class', 'zotero-ner-item-title');
      
      var creators = document.createXULElement('label');
      var creatorsText = this.getItemCreatorsSummary(item);
      creators.setAttribute('value', creatorsText);
      creators.setAttribute('class', 'zotero-ner-item-creators');
      
      vbox.appendChild(title);
      vbox.appendChild(creators);
      listItem.appendChild(vbox);
      
      itemsList.appendChild(listItem);
    }
  },
  
  /**
   * Get a summary of item creators for display
   * @param {Object} item - Zotero item
   * @returns {string} Creators summary
   */
  getItemCreatorsSummary: function(item) {
    try {
      var creators = item.getCreators();
      if (!creators || creators.length === 0) {
        return 'No creators';
      }
      
      var creatorNames = [];
      for (var i = 0; i < Math.min(3, creators.length); i++) {
        var creator = creators[i];
        var name = (creator.firstName || '') + ' ' + (creator.lastName || '');
        creatorNames.push(name.trim());
      }
      
      var summary = creatorNames.join(', ');
      if (creators.length > 3) {
        summary += ', and ' + (creators.length - 3) + ' more';
      }
      
      return summary;
    } catch (e) {
      return 'Error getting creators';
    }
  },
  
  /**
   * Process the next item in the queue
   */
  processNextItem: function() {
    if (this.currentItemIndex >= this.items.length) {
      // All items processed
      this.finishProcessing();
      return;
    }
    
    var item = this.items[this.currentItemIndex];
    this.processItem(item);
  },
  
  /**
   * Process a single item
   * @param {Object} item - Zotero item to process
   */
  processItem: function(item) {
    try {
      // Show progress
      this.showProgress(true);
      this.updateProgress();
      
      // Get creators from the item
      var creators = item.getCreators();
      if (!creators || creators.length === 0) {
        // Skip items with no creators
        this.skipItem();
        return;
      }
      
      // Process each creator
      var creatorResults = [];
      for (var i = 0; i < creators.length; i++) {
        var creator = creators[i];
        var creatorResult = this.processCreator(creator);
        creatorResults.push(creatorResult);
      }
      
      // Store results
      this.normalizationResults[this.currentItemIndex] = {
        item: item,
        creators: creatorResults
      };
      
      // Show suggestions for this item
      this.showSuggestions(creatorResults);
      
      // Enable the apply button
      var applyButton = document.getElementById('apply-button');
      if (applyButton) {
        applyButton.disabled = false;
      }
      
    } catch (e) {
      Zotero.logError(e);
      Zotero.alert(null, 'Error', 'Failed to process item: ' + e.message);
      this.skipItem();
    } finally {
      this.showProgress(false);
    }
  },
  
  /**
   * Process a single creator
   * @param {Object} creator - Creator to process
   * @returns {Object} Processing result
   */
  processCreator: function(creator) {
    try {
      // Build full name
      var fullName = (creator.firstName || '') + ' ' + (creator.lastName || '');
      fullName = fullName.trim();
      
      if (!fullName) {
        return {
          original: creator,
          status: 'skipped',
          reason: 'No name'
        };
      }
      
      // Check if we have a learned mapping
      var learned = this.getLearnedMapping(fullName);
      if (learned) {
        return {
          original: creator,
          normalized: learned,
          status: 'learned',
          confidence: 1.0
        };
      }
      
      // Parse the name using our NER logic
      var parsed = this.parseName(fullName);
      if (!parsed) {
        return {
          original: creator,
          status: 'failed',
          reason: 'Parse failed'
        };
      }
      
      // Generate variants
      var variants = this.generateVariants(parsed);
      
      // Find similar names in the library
      var similars = this.findSimilarNames(fullName);
      
      return {
        original: creator,
        parsed: parsed,
        variants: variants,
        similars: similars,
        status: 'new'
      };
      
    } catch (e) {
      return {
        original: creator,
        status: 'error',
        error: e.message
      };
    }
  },
  
  /**
   * Get learned mapping for a name
   * @param {string} name - Name to look up
   * @returns {string|null} Learned normalized form or null
   */
  getLearnedMapping: function(name) {
    return ZoteroNER.LearningEngine.getMapping(name);
  },
  
  /**
   * Parse a name using NER logic
   * @param {string} name - Name to parse
   * @returns {Object|null} Parsed name components or null
   */
  parseName: function(name) {
    return ZoteroNER.NameParser.parse(name);
  },
  
  /**
   * Generate name variants
   * @param {Object} parsed - Parsed name components
   * @returns {Array} Array of variant forms
   */
  generateVariants: function(parsed) {
    return ZoteroNER.VariantGenerator.generateVariants(parsed);
  },
  
  /**
   * Find similar names in the library
   * @param {string} name - Name to find similar versions of
   * @returns {Array} Array of similar names
   */
  findSimilarNames: function(name) {
    return ZoteroNER.LearningEngine.findSimilar(name);
  },
  
  /**
   * Show suggestions for the current item
   * @param {Array} creatorResults - Results for creators
   */
  showSuggestions: function(creatorResults) {
    var suggestionsContainer = document.getElementById('suggestions-container');
    var suggestionsGroup = document.getElementById('suggestions-group');
    
    if (!suggestionsContainer || !suggestionsGroup) return;
    
    // Clear existing suggestions
    while (suggestionsContainer.firstChild) {
      suggestionsContainer.removeChild(suggestionsContainer.firstChild);
    }
    
    // Add suggestions for each creator
    for (var i = 0; i < creatorResults.length; i++) {
      var result = creatorResults[i];
      var suggestionBox = this.createSuggestionBox(result, i);
      suggestionsContainer.appendChild(suggestionBox);
    }
    
    // Show the suggestions group
    suggestionsGroup.hidden = false;
  },
  
  /**
   * Create a suggestion box for a creator result
   * @param {Object} result - Creator processing result
   * @param {number} index - Index of the creator
   * @returns {Object} XUL element for the suggestion box
   */
  createSuggestionBox: function(result, index) {
    var groupbox = document.createXULElement('groupbox');
    
    var caption = document.createXULElement('caption');
    var originalName = (result.original.firstName || '') + ' ' + (result.original.lastName || '');
    caption.setAttribute('label', 'Creator: ' + originalName.trim());
    groupbox.appendChild(caption);
    
    var vbox = document.createXULElement('vbox');
    
    // Show status
    if (result.status === 'learned') {
      var statusLabel = document.createXULElement('label');
      statusLabel.setAttribute('value', 'Learned: ' + result.normalized);
      statusLabel.setAttribute('style', 'font-weight: bold; color: green;');
      vbox.appendChild(statusLabel);
    } else if (result.status === 'new') {
      // Show variants
      var variantsLabel = document.createXULElement('label');
      variantsLabel.setAttribute('value', 'Suggested variants:');
      vbox.appendChild(variantsLabel);
      
      // Create radio group for variants
      var radiogroup = document.createXULElement('radiogroup');
      radiogroup.setAttribute('id', 'variant-selection-' + index);
      
      // Add original as first option
      var originalRadio = document.createXULElement('radio');
      originalRadio.setAttribute('label', 'Keep original: ' + originalName.trim());
      originalRadio.setAttribute('value', 'original');
      originalRadio.setAttribute('selected', 'true');
      radiogroup.appendChild(originalRadio);
      
      // Add variants
      if (result.variants && result.variants.length > 0) {
        for (var i = 0; i < result.variants.length; i++) {
          var variant = result.variants[i];
          var radio = document.createXULElement('radio');
          radio.setAttribute('label', 'Normalize to: ' + variant);
          radio.setAttribute('value', 'variant-' + i);
          radiogroup.appendChild(radio);
        }
      }
      
      // Add similar names if available
      if (result.similars && result.similars.length > 0) {
        var similarsSeparator = document.createXULElement('separator');
        similarsSeparator.setAttribute('class', 'groove');
        vbox.appendChild(similarsSeparator);
        
        var similarsLabel = document.createXULElement('label');
        similarsLabel.setAttribute('value', 'Similar names found in library:');
        vbox.appendChild(similarsLabel);
        
        for (var j = 0; j < result.similars.length; j++) {
          var similar = result.similars[j];
          var radio = document.createXULElement('radio');
          radio.setAttribute('label', 'Use similar: ' + similar.name + ' (' + similar.frequency + ' occurrences)');
          radio.setAttribute('value', 'similar-' + j);
          radiogroup.appendChild(radio);
        }
      }
      
      vbox.appendChild(radiogroup);
    } else {
      // Show error/skip status
      var statusLabel = document.createXULElement('label');
      var statusText = '';
      switch (result.status) {
        case 'skipped':
          statusText = 'Skipped: ' + (result.reason || 'No name provided');
          break;
        case 'failed':
          statusText = 'Failed to parse: ' + (result.reason || 'Unknown error');
          break;
        case 'error':
          statusText = 'Error: ' + (result.error || 'Processing error');
          break;
        default:
          statusText = 'Status: ' + result.status;
      }
      statusLabel.setAttribute('value', statusText);
      statusLabel.setAttribute('style', 'font-style: italic; color: gray;');
      vbox.appendChild(statusLabel);
    }
    
    groupbox.appendChild(vbox);
    return groupbox;
  },
  
  /**
   * Apply selected normalizations
   */
  applySelected: function() {
    try {
      // Get the current item result
      var itemResult = this.normalizationResults[this.currentItemIndex];
      if (!itemResult) {
        this.skipItem();
        return;
      }
      
      // Get selected normalizations
      var normalizedCreators = this.getSelectedNormalizations(itemResult.creators);
      
      // Apply normalizations to the item
      this.applyNormalizationsToItem(itemResult.item, normalizedCreators);
      
      // Mark as processed
      this.processedItems.push(this.currentItemIndex);
      
      // Move to next item
      this.moveToNextItem();
      
    } catch (e) {
      Zotero.logError(e);
      Zotero.alert(null, 'Error', 'Failed to apply normalizations: ' + e.message);
      this.skipItem();
    }
  },
  
  /**
   * Get selected normalizations from UI
   * @param {Array} creators - Creator results
   * @returns {Array} Array of normalized creators
   */
  getSelectedNormalizations: function(creators) {
    var normalizedCreators = [];
    
    for (var i = 0; i < creators.length; i++) {
      var result = creators[i];
      
      // If it's already learned or has an error, keep original
      if (result.status === 'learned' || result.status === 'skipped' || 
          result.status === 'failed' || result.status === 'error') {
        normalizedCreators.push({
          original: result.original,
          normalized: result.original,
          status: result.status
        });
        continue;
      }
      
      // For new items, get selected variant
      var radiogroup = document.getElementById('variant-selection-' + i);
      if (radiogroup) {
        var selectedValue = radiogroup.value;
        
        if (selectedValue === 'original') {
          // Keep original
          normalizedCreators.push({
            original: result.original,
            normalized: result.original,
            status: 'unchanged'
          });
        } else if (selectedValue.startsWith('variant-')) {
          // Use selected variant
          var variantIndex = parseInt(selectedValue.replace('variant-', ''));
          if (result.variants && variantIndex < result.variants.length) {
            var variant = result.variants[variantIndex];
            normalizedCreators.push({
              original: result.original,
              normalized: this.createCreatorFromName(variant, result.original),
              status: 'normalized',
              variant: variant
            });
          } else {
            // Fallback to original
            normalizedCreators.push({
              original: result.original,
              normalized: result.original,
              status: 'unchanged'
            });
          }
        } else if (selectedValue.startsWith('similar-')) {
          // Use similar name
          var similarIndex = parseInt(selectedValue.replace('similar-', ''));
          if (result.similars && similarIndex < result.similars.length) {
            var similar = result.similars[similarIndex];
            normalizedCreators.push({
              original: result.original,
              normalized: this.createCreatorFromName(similar.name, result.original),
              status: 'normalized',
              similar: similar
            });
          } else {
            // Fallback to original
            normalizedCreators.push({
              original: result.original,
              normalized: result.original,
              status: 'unchanged'
            });
          }
        } else {
          // Fallback to original
          normalizedCreators.push({
            original: result.original,
            normalized: result.original,
            status: 'unchanged'
          });
        }
      } else {
        // No UI element, keep original
        normalizedCreators.push({
          original: result.original,
          normalized: result.original,
          status: 'unchanged'
        });
      }
    }
    
    return normalizedCreators;
  },
  
  /**
   * Create a creator object from a normalized name
   * @param {string} name - Normalized name
   * @param {Object} original - Original creator object
   * @returns {Object} Creator object with firstName and lastName
   */
  createCreatorFromName: function(name, original) {
    const parsed = ZoteroNER.NameParser.parse(name);
    return {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        creatorType: original.creatorType || 'author'
    };
  },
  
  /**
   * Apply normalizations to a Zotero item
   * @param {Object} item - Zotero item
   * @param {Array} normalizedCreators - Array of normalized creators
   */
  applyNormalizationsToItem: async function(item, normalizedCreators) {
    try {
      await ZoteroNER.ItemProcessor.applyNormalizations(item, normalizedCreators);

      // Log the change
      Zotero.debug('Normalized creators for item: ' + item.getField('title'));
      
    } catch (e) {
      Zotero.logError(e);
      throw new Error('Failed to apply normalizations to item: ' + e.message);
    }
  },
  
  /**
   * Skip the current item
   */
  skipItem: function() {
    this.skippedItems.push(this.currentItemIndex);
    this.moveToNextItem();
  },
  
  /**
   * Move to the next item
   */
  moveToNextItem: function() {
    this.currentItemIndex++;
    this.processNextItem();
  },
  
  /**
   * Finish processing all items
   */
  finishProcessing: function() {
    // Show completion message
    var message = 'NER normalization completed!\n\n';
    message += 'Processed items: ' + this.processedItems.length + '\n';
    message += 'Skipped items: ' + this.skippedItems.length + '\n';
    message += 'Total items: ' + this.items.length;
    
    Zotero.alert(null, 'NER Normalization Complete', message);
    
    // Close the dialog
    window.close();
  },
  
  /**
   * Update progress indicator
   */
  updateProgress: function() {
    var progressMeter = document.getElementById('progress-meter');
    var progressLabel = document.getElementById('progress-label');
    
    if (progressMeter && progressLabel) {
      var percent = Math.round((this.currentItemIndex / this.items.length) * 100);
      progressMeter.value = percent;
      progressLabel.value = 'Processing item ' + (this.currentItemIndex + 1) + ' of ' + this.items.length;
    }
  },
  
  /**
   * Show/hide progress indicator
   * @param {boolean} show - Whether to show progress
   */
  showProgress: function(show) {
    var progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.hidden = !show;
    }
  },
  
  /**
   * Cancel the dialog
   */
  cancel: function() {
    window.close();
  }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoteroNER_NormalizationDialog;
}