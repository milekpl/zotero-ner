/**
 * NER Normalization Dialog Controller
 * Provides interactive UI for reviewing and applying author name normalizations.
 */

/* global Zotero, ZoteroNER */

var ZoteroNER_NormalizationDialog = {
  items: [],
  results: [],
  currentItemIndex: 0,
  processedIndices: new Set(),
  skippedIndices: new Set(),
  learningEngine: null,
  variantGenerator: null,
  nameParser: null,
  nerProcessor: null,
  itemProcessor: null,
  isProcessing: false,

  init: function() {
    this.log('Initializing normalization dialog');
    Promise.resolve(this.initialize()).catch((error) => {
      Zotero.logError(error);
      this.alert('Error', 'Failed to initialize normalization dialog: ' + error.message);
      window.close();
    });
  },

  log: function(message) {
    try {
      if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
        Zotero.debug('Zotero NER Dialog: ' + message);
      }
    } catch (e) {}
  },

  alert: function(title, message) {
    try {
      if (typeof Zotero !== 'undefined' && typeof Zotero.alert === 'function') {
        Zotero.alert(null, title, message);
      } else {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(title + ': ' + message);
        }
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(title + ': ' + message);
      }
    }
  },

  initialize: async function() {
    // Check if Zotero is available before proceeding
    if (typeof Zotero === 'undefined') {
      this.alert('Error', 'Zotero object not found. This dialog must run in a Zotero context.');
      window.close();
      return;
    }
    
    await this.ensureComponents();

    // Check if we have pre-computed analysis results
    var args = window.arguments || [];
    if (args.length > 0 && args[0] && args[0].analysisResults) {
      // Use pre-computed analysis results
      this.analysisResults = args[0].analysisResults;
      this.items = []; // No need for individual items when we have analysis results
    } else {
      // Resolve items normally (backward compatibility)
      this.items = await this.resolveItems();
      if (!this.items || this.items.length === 0) {
        this.alert('NER Author Name Normalizer', 'No items available for normalization.');
        window.close();
        return;
      }
    }

    this.populateItemsList();
    this.currentItemIndex = 0;
    await this.renderCurrentItem();
    this.updateProgress();
  },

  ensureComponents: async function() {
    // Only try to get components from Zotero if it's available
    if (typeof Zotero !== 'undefined') {
      if (!this.learningEngine) {
        if (Zotero.NER && Zotero.NER.learningEngine) {
          this.learningEngine = Zotero.NER.learningEngine;
        } else if (typeof ZoteroNER !== 'undefined' && ZoteroNER.LearningEngine) {
          this.learningEngine = new ZoteroNER.LearningEngine();
        }
      }

      if (!this.itemProcessor && typeof ZoteroNER !== 'undefined' && ZoteroNER.ItemProcessor) {
        this.itemProcessor = new ZoteroNER.ItemProcessor();
        if (this.learningEngine) {
          this.itemProcessor.learningEngine = this.learningEngine;
        }
        if (this.nameParser) {
          this.itemProcessor.nameParser = this.nameParser;
        }
        if (this.variantGenerator) {
          this.itemProcessor.variantGenerator = this.variantGenerator;
        }
      }
    } else {
      // If Zotero isn't available, try to use standalone components
      if (!this.learningEngine && typeof ZoteroNER !== 'undefined' && ZoteroNER.LearningEngine) {
        this.learningEngine = new ZoteroNER.LearningEngine();
      }
      if (!this.variantGenerator && typeof ZoteroNER !== 'undefined' && ZoteroNER.VariantGenerator) {
        this.variantGenerator = new ZoteroNER.VariantGenerator();
      }
      if (!this.nameParser && typeof ZoteroNER !== 'undefined' && ZoteroNER.NameParser) {
        this.nameParser = new ZoteroNER.NameParser();
      }
      if (!this.itemProcessor && typeof ZoteroNER !== 'undefined' && ZoteroNER.ItemProcessor) {
        this.itemProcessor = new ZoteroNER.ItemProcessor();
        if (this.learningEngine) {
          this.itemProcessor.learningEngine = this.learningEngine;
        }
        if (this.nameParser) {
          this.itemProcessor.nameParser = this.nameParser;
        }
        if (this.variantGenerator) {
          this.itemProcessor.variantGenerator = this.variantGenerator;
        }
      }
    }

    await this.ensureNERProcessor();
  },

  ensureNERProcessor: async function() {
    if (!this.nerProcessor) {
      if (typeof Zotero !== 'undefined' && Zotero.NER && Zotero.NER.nerProcessor) {
        this.nerProcessor = Zotero.NER.nerProcessor;
      } else if (typeof ZoteroNER !== 'undefined' && ZoteroNER.NERProcessor) {
        this.nerProcessor = new ZoteroNER.NERProcessor();
      }
    }

    if (this.nerProcessor && typeof this.nerProcessor.initialize === 'function' && !this.nerProcessor.isInitialized) {
      try {
        await this.nerProcessor.initialize();
      } catch (error) {
        this.log('NER processor initialization failed: ' + error.message);
      }
    }

    return this.nerProcessor;
  },

  resolveItems: async function() {
    var args = window.arguments || [];
    if (args.length > 0 && args[0] && 'items' in args[0]) {
      // If items parameter was explicitly passed (whether array, null, or undefined), it means
      // the caller wants to determine what to process - either specific items or all items
      // If it's an array with items, return those
      // If it's null or undefined, then fetch all items
      if (Array.isArray(args[0].items) && args[0].items.length > 0) {
        return args[0].items;
      }
      // If items array is empty or null/undefined, process all items
    } else {
      // If no items parameter was passed at all, try to get selected items first
      if (typeof Zotero !== 'undefined' && Zotero.getActiveZoteroPane) {
        var pane = Zotero.getActiveZoteroPane();
        if (pane && typeof pane.getSelectedItems === 'function') {
          var selected = pane.getSelectedItems();
          if (selected && selected.length > 0) {
            return selected;
          }
        }
      }
    }
    
    // If we reach here, either:
    // 1. items parameter was null/undefined/empty array (meaning process all)
    // 2. No items were selected in Zotero
    // 3. No items parameter was provided but no items were selected
    // In all these cases, we should process all items with creators
    if (typeof Zotero !== 'undefined' && typeof Zotero.getActiveZoteroPane === 'function') {
      try {
        var pane = Zotero.getActiveZoteroPane();
        if (!pane) {
          this.log('Could not get Zotero pane');
          return [];
        }
        
        var collectionTreeRow = pane.getSelectedCollection ? pane.getSelectedCollection() : null;
        if (collectionTreeRow) {
          // Get all items from the selected library/collection
          var search = new Zotero.Search();
          search.addCondition('libraryID', 'is', collectionTreeRow.ref && collectionTreeRow.ref.libraryID);
          
          if (collectionTreeRow.ref && collectionTreeRow.ref.id !== 0) { // 0 means the main library, other IDs mean specific collections
            search.addCondition('collectionID', 'is', collectionTreeRow.ref.id);
          }
          
          var itemIDs = await search.search();
          var allItems = [];
          
          if (itemIDs && itemIDs.length > 0) {
            allItems = await Zotero.Items.getAsync(itemIDs);
          }
          
          // Filter to only include items that have creators
          var itemsWithCreators = allItems.filter(item => {
            try {
              // Check if the item has creators
              const creators = item.getCreators ? item.getCreators() : [];
              return creators && Array.isArray(creators) && creators.length > 0;
            } catch (e) {
              // If there's an error getting creators, skip this item
              return false;
            }
          });
          
          return itemsWithCreators;
        } else {
          // If no collection is selected, get items from the user library
          var libraryID = typeof Zotero.Libraries !== 'undefined' && typeof Zotero.Libraries.userLibraryID !== 'undefined' 
            ? Zotero.Libraries.userLibraryID 
            : 1; // Default to main library if we can't get it
          var search = new Zotero.Search();
          search.addCondition('libraryID', 'is', libraryID);
          
          var itemIDs = await search.search();
          var allItems = [];
          
          if (itemIDs && itemIDs.length > 0) {
            allItems = await Zotero.Items.getAsync(itemIDs);
          }
          
          // Filter to only include items that have creators
          var itemsWithCreators = allItems.filter(item => {
            try {
              // Check if the item has creators
              const creators = item.getCreators ? item.getCreators() : [];
              return creators && Array.isArray(creators) && creators.length > 0;
            } catch (e) {
              // If there's an error getting creators, skip this item
              return false;
            }
          });
          
          return itemsWithCreators;
        }
      } catch (error) {
        this.log('Failed to fetch all items, using empty list: ' + error.message);
        return [];
      }
    }

    return [];
  },

  populateItemsList: function() {
    var list = document.getElementById('items-list');
    if (!list) {
      return;
    }

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    // If we have analysis results, show those instead of individual items
    if (this.analysisResults && this.analysisResults.suggestions) {
      // Show analysis results
      for (var i = 0; i < this.analysisResults.suggestions.length; i++) {
        var suggestion = this.analysisResults.suggestions[i];
        var listItem = this.createNode('richlistitem');
        listItem.setAttribute('value', i);
        listItem.setAttribute('class', 'zotero-ner-item');

        var vbox = this.createNode('vbox');

        var titleLabel = this.createNode('label');
        titleLabel.setAttribute('value', `Potential name variant group (${suggestion.variants.length} variants)`);
        titleLabel.setAttribute('class', 'zotero-ner-item-title');

        var creatorsLabel = this.createNode('label');
        var variantNames = suggestion.variants.map(v => `${v.name} (${v.frequency} occurrences)`).join(', ');
        creatorsLabel.setAttribute('value', variantNames);
        creatorsLabel.setAttribute('class', 'zotero-ner-item-creators');

        vbox.appendChild(titleLabel);
        vbox.appendChild(creatorsLabel);
        listItem.appendChild(vbox);
        list.appendChild(listItem);
      }
    } else if (this.items && this.items.length > 0) {
      // Show individual items (backward compatibility)
      for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        var listItem = this.createNode('richlistitem');
        listItem.setAttribute('value', i);
        listItem.setAttribute('class', 'zotero-ner-item');

        var vbox = this.createNode('vbox');

        var titleLabel = this.createNode('label');
        titleLabel.setAttribute('value', item.getField ? (item.getField('title') || 'Untitled') : 'Untitled');
        titleLabel.setAttribute('class', 'zotero-ner-item-title');

        var creatorsLabel = this.createNode('label');
        creatorsLabel.setAttribute('value', this.describeCreators(item));
        creatorsLabel.setAttribute('class', 'zotero-ner-item-creators');

        vbox.appendChild(titleLabel);
        vbox.appendChild(creatorsLabel);
        listItem.appendChild(vbox);
        list.appendChild(listItem);
      }
    } else {
      // Show a message when no items are available
      var listItem = this.createNode('richlistitem');
      listItem.setAttribute('class', 'zotero-ner-item zotero-ner-item-empty');
      
      var vbox = this.createNode('vbox');
      
      var titleLabel = this.createNode('label');
      titleLabel.setAttribute('value', 'No items with creators found');
      titleLabel.setAttribute('class', 'zotero-ner-item-title');
      
      var creatorsLabel = this.createNode('label');
      creatorsLabel.setAttribute('value', 'There are no items with creators in the current library or selection');
      creatorsLabel.setAttribute('class', 'zotero-ner-item-creators');
      
      vbox.appendChild(titleLabel);
      vbox.appendChild(creatorsLabel);
      listItem.appendChild(vbox);
      list.appendChild(listItem);
    }

    this.highlightCurrentItem();
  },

  describeCreators: function(item) {
    if (!item || typeof item.getCreators !== 'function') {
      return 'No creators';
    }

    var creators = item.getCreators();
    if (!creators || creators.length === 0) {
      return 'No creators';
    }

    var summary = creators.slice(0, 3).map((creator) => this.formatCreatorName(creator)).join(', ');
    if (creators.length > 3) {
      summary += '…';
    }
    return summary || 'Creators available';
  },

  createNode: function(tagName) {
    if (document.createXULElement) {
      try {
        return document.createXULElement(tagName);
      } catch (e) {}
    }
    return document.createElement(tagName);
  },

  highlightCurrentItem: function() {
    var list = document.getElementById('items-list');
    if (!list) {
      return;
    }

    list.selectedIndex = this.currentItemIndex;
    if (typeof list.ensureIndexIsVisible === 'function') {
      list.ensureIndexIsVisible(this.currentItemIndex);
    }
  },

  renderCurrentItem: async function() {
    if (!this.items || this.currentItemIndex >= this.items.length) {
      this.finishProcessing();
      return;
    }

    var item = this.items[this.currentItemIndex];
    this.setDialogBusy(true);

    try {
      var itemResult = this.results[this.currentItemIndex];
      if (!itemResult) {
        itemResult = await this.computeItemResult(item);
        this.results[this.currentItemIndex] = itemResult;
      }

      this.renderSuggestionsForItem(itemResult);
      this.highlightCurrentItem();
      this.setApplyEnabled(itemResult.creators && itemResult.creators.length > 0);
    } catch (error) {
      Zotero.logError(error);
      this.alert('Error', 'Failed to process item "' + this.formatNameString(item.getField ? item.getField('title') : '') + '": ' + error.message);
      this.skippedIndices.add(this.currentItemIndex);
      this.currentItemIndex++;
      if (this.currentItemIndex < this.items.length) {
        await this.renderCurrentItem();
      } else {
        this.finishProcessing();
      }
      return;
    } finally {
      this.setDialogBusy(false);
      this.updateProgress();
    }
  },

  computeItemResult: async function(item) {
    var creators = item.getCreators ? item.getCreators() : [];
    var creatorResults = [];

    for (var i = 0; i < creators.length; i++) {
      var creatorResult = await this.computeCreatorResult(creators[i]);
      creatorResults.push(creatorResult);
    }

    return {
      item: item,
      creators: creatorResults
    };
  },

  computeCreatorResult: async function(creator) {
    var original = this.cloneCreator(creator);
    var displayName = this.formatCreatorName(original);

    if (!displayName) {
      return {
        original: original,
        displayName: '',
        status: 'skipped',
        reason: 'No name available'
      };
    }

    var learnedDetails = null;
    if (this.learningEngine) {
      if (typeof this.learningEngine.getMappingDetails === 'function') {
        learnedDetails = this.learningEngine.getMappingDetails(displayName);
      } else if (typeof this.learningEngine.getMapping === 'function') {
        var learnedValue = this.learningEngine.getMapping(displayName);
        if (learnedValue) {
          learnedDetails = { normalized: learnedValue, confidence: 1 };
        }
      }
    }

    if (learnedDetails && learnedDetails.normalized) {
      return {
        original: original,
        displayName: displayName,
        status: 'learned',
        learned: learnedDetails,
        normalized: this.createCreatorFromString(learnedDetails.normalized, original),
        confidence: learnedDetails.confidence || 1,
        variants: [],
        similars: [],
        ner: null
      };
    }

    var nerProcessor = await this.ensureNERProcessor();
    var nerParsed = null;
    var nerEntities = [];
    if (nerProcessor && typeof nerProcessor.parseName === 'function') {
      try {
        nerParsed = await nerProcessor.parseName(displayName);
        if (typeof nerProcessor.processText === 'function') {
          nerEntities = await nerProcessor.processText(displayName);
        }
      } catch (error) {
        this.log('NER parsing failed for "' + displayName + '": ' + error.message);
      }
    }

    var parsed = nerParsed || (this.nameParser ? this.nameParser.parse(displayName) : null);
    var variants = this.generateVariantCandidates(parsed, displayName, nerParsed);
    var similars = this.findSimilarNames(displayName);
    var recommended = variants.length > 0 ? variants[0] : null;

    return {
      original: original,
      displayName: displayName,
      status: 'new',
      parsed: parsed,
      ner: {
        parsed: nerParsed,
        entities: nerEntities
      },
      variants: variants,
      similars: similars,
      recommended: recommended
    };
  },

  generateVariantCandidates: function(parsed, originalName, nerParsed) {
    var seen = new Set();
    var variants = [];

    var pushVariant = (candidate) => {
      if (!candidate) {
        return;
      }
      var trimmed = String(candidate).trim();
      if (!trimmed) {
        return;
      }
      if (trimmed.toLowerCase() === originalName.toLowerCase()) {
        return;
      }
      var key = trimmed.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      variants.push(trimmed);
    };

    if (nerParsed) {
      pushVariant(this.buildNameFromParsed(nerParsed));
    }

    if (parsed && this.variantGenerator && typeof this.variantGenerator.generateVariants === 'function') {
      try {
        var generated = this.variantGenerator.generateVariants(parsed) || [];
        for (var i = 0; i < generated.length; i++) {
          pushVariant(generated[i]);
        }
      } catch (error) {
        this.log('Variant generation failed: ' + error.message);
      }
    }

    return variants;
  },

  buildNameFromParsed: function(parsed) {
    if (!parsed) {
      return '';
    }
    var parts = [];
    if (parsed.firstName) parts.push(parsed.firstName);
    if (parsed.middleName) parts.push(parsed.middleName);
    if (parsed.prefix) parts.push(parsed.prefix);
    if (parsed.lastName) parts.push(parsed.lastName);
    if (parsed.suffix) parts.push(parsed.suffix);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  },

  findSimilarNames: function(name) {
    if (!this.learningEngine || typeof this.learningEngine.findSimilar !== 'function') {
      return [];
    }

    try {
      var similars = this.learningEngine.findSimilar(name) || [];
      return similars.map((entry) => ({
        raw: entry.raw,
        normalized: entry.normalized,
        similarity: entry.similarity,
        usageCount: entry.usageCount || 0,
        confidence: entry.confidence || 0
      }));
    } catch (error) {
      this.log('Failed to find similar names: ' + error.message);
      return [];
    }
  },

  renderSuggestionsForItem: function(itemResult) {
    var container = document.getElementById('suggestions-container');
    var group = document.getElementById('suggestions-group');

    if (!container || !group) {
      return;
    }

    this.clearSuggestions();

    if (!itemResult || !itemResult.creators || itemResult.creators.length === 0) {
      group.hidden = false;
      var emptyLabel = this.createNode('label');
      emptyLabel.setAttribute('value', 'No creators found for this item.');
      emptyLabel.setAttribute('class', 'ner-creator-empty');
      container.appendChild(emptyLabel);
      this.setApplyEnabled(false);
      return;
    }

    group.hidden = false;

    for (var i = 0; i < itemResult.creators.length; i++) {
      this.renderCreatorGroup(container, itemResult.creators[i], i);
    }
  },

  renderCreatorGroup: function(container, result, index) {
    var groupbox = this.createNode('groupbox');
    groupbox.setAttribute('class', 'ner-creator-group');

    var caption = this.createNode('caption');
    caption.setAttribute('label', 'Creator ' + (index + 1));
    groupbox.appendChild(caption);

    var body = this.createNode('vbox');
    body.setAttribute('class', 'ner-creator-body');

    var originalLabel = this.createNode('label');
    originalLabel.setAttribute('value', 'Original: ' + this.formatNameString(result.displayName || this.formatCreatorName(result.original)));
    originalLabel.setAttribute('class', 'ner-creator-original');
    body.appendChild(originalLabel);

    var radiogroup = this.createNode('radiogroup');
    radiogroup.setAttribute('id', 'ner-normalization-choice-' + index);
    radiogroup.setAttribute('orient', 'vertical');

    var originalRadio = this.createNode('radio');
    originalRadio.setAttribute('value', 'original');
    originalRadio.setAttribute('label', 'Keep original');
    radiogroup.appendChild(originalRadio);

    var defaultValue = 'original';

    if (result.status === 'learned' && result.learned && result.learned.normalized) {
      var learnedRadio = this.createNode('radio');
      learnedRadio.setAttribute('value', 'learned');
      learnedRadio.setAttribute('label', 'Use learned form: ' + this.formatNameString(result.learned.normalized));
      radiogroup.appendChild(learnedRadio);
      defaultValue = 'learned';

      if (typeof result.learned.confidence === 'number') {
        var confidenceLabel = this.createNode('label');
        confidenceLabel.setAttribute('class', 'ner-creator-meta');
        confidenceLabel.setAttribute('value', 'Confidence: ' + Math.round(result.learned.confidence * 100) + '%');
        body.appendChild(confidenceLabel);
      }
    } else {
      if (result.recommended) {
        var recommendedRadio = this.createNode('radio');
        recommendedRadio.setAttribute('value', 'recommended');
        recommendedRadio.setAttribute('label', 'NER suggestion: ' + this.formatNameString(result.recommended));
        radiogroup.appendChild(recommendedRadio);
        defaultValue = 'recommended';
      }

      if (result.variants && result.variants.length > 0) {
        var variantsLabel = this.createNode('label');
        variantsLabel.setAttribute('class', 'ner-creator-meta');
        variantsLabel.setAttribute('value', 'Generated variants:');
        body.appendChild(variantsLabel);

        for (var v = 0; v < result.variants.length; v++) {
          var variantRadio = this.createNode('radio');
          variantRadio.setAttribute('value', 'variant-' + v);
          variantRadio.setAttribute('label', this.formatNameString(result.variants[v]));
          radiogroup.appendChild(variantRadio);
        }
      }

      if (result.similars && result.similars.length > 0) {
        var similarsLabel = this.createNode('label');
        similarsLabel.setAttribute('class', 'ner-creator-meta');
        similarsLabel.setAttribute('value', 'Learned suggestions:');
        body.appendChild(similarsLabel);

        for (var s = 0; s < result.similars.length; s++) {
          var similar = result.similars[s];
          var similarRadio = this.createNode('radio');
          var label = this.formatNameString(similar.normalized);
          if (typeof similar.similarity === 'number') {
            label += ' • ' + Math.round(similar.similarity * 100) + '% match';
          }
          if (similar.usageCount) {
            label += ' (' + similar.usageCount + ' uses)';
          }
          similarRadio.setAttribute('value', 'similar-' + s);
          similarRadio.setAttribute('label', label);
          radiogroup.appendChild(similarRadio);
        }
      }
    }

    radiogroup.value = defaultValue;
    body.appendChild(radiogroup);

    if (result.ner && Array.isArray(result.ner.entities) && result.ner.entities.length > 0) {
      var nerLabel = this.createNode('label');
      nerLabel.setAttribute('class', 'ner-creator-meta');
      nerLabel.setAttribute('value', 'NER entities: ' + this.formatEntities(result.ner.entities));
      body.appendChild(nerLabel);
    }

    groupbox.appendChild(body);
    container.appendChild(groupbox);
  },

  clearSuggestions: function() {
    var container = document.getElementById('suggestions-container');
    if (!container) {
      return;
    }
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  },

  setApplyEnabled: function(enabled) {
    var applyButton = document.getElementById('apply-button');
    if (applyButton) {
      applyButton.disabled = !enabled || this.isProcessing;
    }
  },

  setDialogBusy: function(isBusy) {
    this.isProcessing = isBusy;
    this.showProgress(isBusy);

    var applyButton = document.getElementById('apply-button');
    var skipButton = document.getElementById('skip-button');

    if (applyButton) {
      applyButton.disabled = isBusy;
    }
    if (skipButton) {
      skipButton.disabled = isBusy;
    }
  },

  showProgress: function(show) {
    var progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.hidden = !show;
    }
  },

  formatEntities: function(entities) {
    return entities.map(function(entity) {
      return entity.text + ' [' + (entity.label || 'entity') + ']';
    }).join(', ');
  },

  applySelected: async function() {
    if (this.isProcessing) {
      return;
    }

    var itemResult = this.results[this.currentItemIndex];
    if (!itemResult) {
      this.skipItem();
      return;
    }

    var normalizations = this.collectNormalizations(itemResult);
    this.setDialogBusy(true);

    try {
      await this.applyNormalizationsToItem(itemResult.item, normalizations);
      this.processedIndices.add(this.currentItemIndex);
      this.moveToNextItem();
    } catch (error) {
      Zotero.logError(error);
      this.alert('Error', 'Failed to apply normalizations: ' + error.message);
      this.skippedIndices.add(this.currentItemIndex);
      this.moveToNextItem();
    } finally {
      this.setDialogBusy(false);
      this.updateProgress();
    }
  },

  collectNormalizations: function(itemResult) {
    var normalizedCreators = [];

    for (var i = 0; i < itemResult.creators.length; i++) {
      var choiceNode = document.getElementById('ner-normalization-choice-' + i);
      var choice = choiceNode ? choiceNode.value : 'original';
      normalizedCreators.push(this.buildNormalizationEntry(itemResult.creators[i], choice));
    }

    return normalizedCreators;
  },

  buildNormalizationEntry: function(result, choice) {
    var originalClone = this.cloneCreator(result.original);
    var entry = {
      original: originalClone,
      normalized: originalClone,
      accepted: false,
      status: 'unchanged',
      source: 'original'
    };

    if (!result) {
      return entry;
    }

    if (choice === 'learned' && result.learned && result.learned.normalized) {
      entry.normalized = this.createCreatorFromString(result.learned.normalized, result.original);
      entry.accepted = true;
      entry.status = 'normalized';
      entry.source = 'learned';
      entry.confidence = result.learned.confidence || 1;
      entry.normalizedLabel = result.learned.normalized;
      return entry;
    }

    if (choice === 'recommended' && result.recommended) {
      entry.normalized = this.createCreatorFromString(result.recommended, result.original);
      entry.accepted = true;
      entry.status = 'normalized';
      entry.source = 'ner';
      entry.normalizedLabel = result.recommended;
      return entry;
    }

    if (choice && choice.indexOf('variant-') === 0) {
      var variantIndex = parseInt(choice.replace('variant-', ''), 10);
      if (result.variants && variantIndex >= 0 && variantIndex < result.variants.length) {
        var variantValue = result.variants[variantIndex];
        entry.normalized = this.createCreatorFromString(variantValue, result.original);
        entry.accepted = true;
        entry.status = 'normalized';
        entry.source = 'variant';
        entry.normalizedLabel = variantValue;
      }
      return entry;
    }

    if (choice && choice.indexOf('similar-') === 0) {
      var similarIndex = parseInt(choice.replace('similar-', ''), 10);
      if (result.similars && similarIndex >= 0 && similarIndex < result.similars.length) {
        var similar = result.similars[similarIndex];
        entry.normalized = this.createCreatorFromString(similar.normalized, result.original);
        entry.accepted = true;
        entry.status = 'normalized';
        entry.source = 'similar';
        entry.normalizedLabel = similar.normalized;
        entry.confidence = similar.similarity || similar.confidence || 0;
      }
      return entry;
    }

    return entry;
  },

  createCreatorFromString: function(name, original) {
    var parser = this.ensureNameParser();
    if (!parser) {
      return this.cloneCreator(original);
    }
    var parsed = parser.parse(name);
    return {
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      creatorType: original && original.creatorType ? original.creatorType : 'author'
    };
  },

  ensureNameParser: function() {
    if (!this.nameParser && typeof ZoteroNER !== 'undefined' && ZoteroNER.NameParser) {
      this.nameParser = new ZoteroNER.NameParser();
    }
    return this.nameParser;
  },

  cloneCreator: function(creator) {
    if (!creator) {
      return { firstName: '', lastName: '', creatorType: 'author' };
    }
    return {
      firstName: creator.firstName || '',
      lastName: creator.lastName || '',
      creatorType: creator.creatorType || 'author'
    };
  },

  formatCreatorName: function(creator) {
    if (!creator) {
      return '';
    }
    if (creator.name) {
      return creator.name;
    }
    var parts = [];
    if (creator.firstName) parts.push(creator.firstName);
    if (creator.lastName) parts.push(creator.lastName);
    return parts.join(' ').trim();
  },

  formatNameString: function(value) {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value.firstName || value.lastName) {
      return this.formatCreatorName(value);
    }
    return String(value);
  },

  applyNormalizationsToItem: async function(item, normalizations) {
    if (!this.itemProcessor || typeof this.itemProcessor.applyNormalizations !== 'function') {
      throw new Error('Item processor not available');
    }

    await this.itemProcessor.applyNormalizations(item, normalizations);
  },

  skipItem: function() {
    if (this.isProcessing) {
      return;
    }
    this.skippedIndices.add(this.currentItemIndex);
    this.moveToNextItem();
  },

  moveToNextItem: function() {
    this.currentItemIndex++;
    if (this.currentItemIndex >= this.items.length) {
      this.finishProcessing();
    } else {
      Promise.resolve(this.renderCurrentItem());
    }
  },

  finishProcessing: function() {
    var processedCount = this.processedIndices.size;
    var skippedCount = this.skippedIndices.size;
    var total = this.items.length;

    this.alert('NER Author Name Normalizer',
      'Normalization complete!\n\n' +
      'Processed items: ' + processedCount + '\n' +
      'Skipped items: ' + skippedCount + '\n' +
      'Total items: ' + total);

    window.close();
  },

  updateProgress: function() {
    var progressMeter = document.getElementById('progress-meter');
    var progressLabel = document.getElementById('progress-label');

    if (!progressMeter || !progressLabel || !this.items.length) {
      return;
    }

    var completed = this.processedIndices.size + this.skippedIndices.size;
    var percent = Math.min(100, Math.round((completed / this.items.length) * 100));
    progressMeter.value = percent;
    progressLabel.value = 'Item ' + Math.min(this.currentItemIndex + 1, this.items.length) + ' of ' + this.items.length;
  },

  cancel: function() {
    window.close();
  }
};

window.addEventListener('load', function() {
  // Ensure Zotero is available before initializing
  if (typeof Zotero === 'undefined') {
    // If Zotero is not available, wait a bit and try again, or show an error message
    setTimeout(function() {
      if (typeof Zotero !== 'undefined') {
        ZoteroNER_NormalizationDialog.init();
      } else {
        // If Zotero is still not available, show an appropriate error
        alert('Zotero object not found. This dialog must run in a Zotero context.');
        window.close();
      }
    }, 100);
  } else {
    ZoteroNER_NormalizationDialog.init();
  }
}, false);
