/**
 * Main entry point for the Zotero NER Author Name Normalization Extension
 * This would be the bootstrap file for the Zotero extension
 */

// Import core modules
const NERProcessor = require('./src/core/ner-processor.js');
const NameParser = require('./src/core/name-parser.js');
const VariantGenerator = require('./src/core/variant-generator.js');
const LearningEngine = require('./src/core/learning-engine.js');
const CandidateFinder = require('./src/core/candidate-finder.js');
const ItemProcessor = require('./src/zotero/item-processor.js');
const MenuIntegration = require('./src/zotero/menu-integration.js');
const DataManager = require('./src/storage/data-manager.js');
const ZoteroDBAnalyzer = require('./src/zotero/zotero-db-analyzer.js');

class ZoteroNERExtension {
  constructor() {
    this.isInitialized = false;
    this.dataManager = new DataManager();
    this.learningEngine = new LearningEngine();
    this.nerProcessor = new NERProcessor();
    this.candidateFinder = new CandidateFinder();
    this.zoteroDBAnalyzer = new ZoteroDBAnalyzer();
    this.itemProcessor = new ItemProcessor();
    this.menuIntegration = new MenuIntegration();
  }

  /**
   * Initialize the extension
   */
  async initialize() {
    console.log('Initializing Zotero NER Author Name Normalization Extension');
    
    // Load settings
    this.settings = await this.dataManager.loadSettings();
    
    // Initialize components
    await this.learningEngine.loadMappings();
    await this.nerProcessor.initialize();
    
    // Initialize menu integration
    await this.menuIntegration.initialize();
    
    this.isInitialized = true;
    console.log('Extension initialized successfully');
  }

  /**
   * Shutdown the extension
   */
  async shutdown() {
    console.log('Shutting down Zotero NER Author Name Normalization Extension');
    
    // Save any pending data
    const mappings = this.learningEngine.getAllMappings();
    await this.dataManager.saveMappings(mappings);
    
    this.isInitialized = false;
  }

  /**
   * Process selected Zotero items
   * @param {Array} items - Array of Zotero items to process
   */
  async processItems(items) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Process the items using menu integration
    return await this.menuIntegration.handleNormalizeAction(items);
  }

  /**
   * Perform full library analysis for name variants
   */
  async performFullLibraryAnalysis() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return await this.menuIntegration.handleFullLibraryAnalysis();
  }

  /**
   * Get the learning engine instance
   */
  getLearningEngine() {
    return this.learningEngine;
  }

  /**
   * Get the item processor instance
   */
  getItemProcessor() {
    return this.itemProcessor;
  }

  /**
   * Get the NER processor instance
   */
  getNERProcessor() {
    return this.nerProcessor;
  }

  /**
   * Get the candidate finder instance
   */
  getCandidateFinder() {
    return this.candidateFinder;
  }

  /**
   * Get the Zotero DB analyzer instance
   */
  getZoteroDBAnalyzer() {
    return this.zoteroDBAnalyzer;
  }
}

// For Zotero integration, attach to Zotero namespace when available
if (typeof Zotero !== 'undefined') {
  // Running in Zotero context
  if (!Zotero.NERAuthorNormalizer) {
    Zotero.NERAuthorNormalizer = new ZoteroNERExtension();
  }
} else {
  // For testing purposes or Node.js environment
  module.exports = ZoteroNERExtension;
}

// Initialize the extension when loaded in Zotero
if (typeof Zotero !== 'undefined') {
  window.addEventListener('load', async function(e) {
    if (Zotero.NERAuthorNormalizer) {
      await Zotero.NERAuthorNormalizer.initialize();
    }
  }, false);
}